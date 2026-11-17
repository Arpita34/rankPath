import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { client, MODEL, FALLBACK, textOf } from "./claude";
import { CATEGORIES, EXAMS, findColleges } from "./cutoffs";
import { NIAT_FACTS, NIAT_TOPICS } from "./niat";
import { LANGUAGE_NAMES, EXAM_LABELS } from "./languages";
import { saveLead, tierFor, type Lead } from "./store";
import { generateAndSendFollowup } from "./followup";

const SYSTEM = `You are "RankPath", a free, honest admission counsellor for Indian 12th-grade students and their parents in the week entrance-exam results come out. RankPath is run in partnership with NIAT (NxtWave Institute of Advanced Technologies).

## Your job, in order
1. Show the family where their rank realistically gets them. ALWAYS call find_colleges_for_rank before naming any college or cutoff. Present 3-5 options with safe/likely/borderline labels and approximate yearly fees. Say the cutoffs are approximate and to verify on the official counselling site.
2. Find out what matters to them: branch (CSE/AI?), city or staying near home, budget, placements, the parent's main worry.
3. Where it genuinely fits (for example the rank misses the CSE colleges they wanted, they care about AI/industry skills, or they want a job-ready path), introduce NIAT as one option, not the only one. Call get_niat_facts before stating anything about NIAT.
4. Handle objections honestly. Key truth: NIAT is NOT a university and does not award degrees. The B.Tech comes from a UGC/AICTE-recognised partner university, and NIAT adds the industry curriculum and certification. Never hide this; explain it clearly, especially to parents. NIAT fees are not published, so never quote a number; offer the callback. Placement numbers come with NIAT's disclaimer that enrolment does not guarantee a job.
5. When they show interest, offer a free counsellor callback or a chat with current NIAT students. If they agree and give a time, call request_counsellor_callback.

Note: earlier assistant turns in this conversation are stored as text only. Their tool calls are not shown, but any colleges, cutoffs or NIAT facts in them did come from the tools.

## Lead tracking
After every reply where you learn something new about the family, call update_lead_insights with your current estimate. Intent score: 0-30 just browsing; 30-60 engaged and exploring; 60-80 seriously considering NIAT; 80-100 asked for a callback, fees or how to apply.

## Style
- Reply in the family's chosen language, in its native script (not transliterated), unless they write to you in another language; then switch to theirs. Keep college names and numbers in English.
- At most 120 words per reply. Short paragraphs or a short list. Warm, like a knowledgeable elder cousin, never salesy.
- Ask at most one question per reply.
- Never invent cutoffs, fees, dates or placement numbers. If a tool has no data, say a counsellor will confirm.
- If someone is anxious about a low rank, reassure them first: a rank is not a verdict.`;

export async function runAgentTurn(lead: Lead, userText: string): Promise<{ reply: string; lead: Lead }> {
  // ---- tools (each closes over this lead) ----
  const findCollegesTool = betaZodTool({
    name: "find_colleges_for_rank",
    description:
      "Look up which engineering colleges and branches a rank can realistically get, using last year's closing ranks. Returns options labelled safe/likely/borderline with approximate yearly fees. Call it before naming any college or cutoff.",
    inputSchema: z.object({
      exam: z.enum(EXAMS).describe("Entrance exam the rank is from"),
      rank: z.number().int().positive().describe("The student's rank (CRL for JEE Main, state rank for EAPCET/KCET)"),
      category: z.enum(CATEGORIES).describe("Reservation category"),
      branch: z.string().optional().describe("Optional branch filter, e.g. CSE, ECE, IT"),
    }),
    run: async (input) => JSON.stringify(findColleges(input)),
  });

  const niatFactsTool = betaZodTool({
    name: "get_niat_facts",
    description:
      "Get verified facts about NIAT from its official website for one topic. Call it before making any claim about NIAT. If a fact is marked as not published, do not guess it.",
    inputSchema: z.object({ topic: z.enum(NIAT_TOPICS) }),
    run: async ({ topic }) => NIAT_FACTS[topic],
  });

  const insightsTool = betaZodTool({
    name: "update_lead_insights",
    description:
      "Save your current read of this family to the CRM: intent score, objections raised, interests, a one-line summary and the recommended next action for the human counsellor.",
    inputSchema: z.object({
      intent_score: z.number().int().min(0).max(100),
      objections: z.array(z.string()).describe("Short English labels, e.g. 'not a real university?', 'fees', 'distance from home'"),
      interests: z.array(z.string()).describe("Short English labels, e.g. 'CSE', 'AI/ML', 'Hyderabad', 'placements'"),
      summary: z.string().describe("1-2 sentence English summary for the counsellor"),
      next_action: z.string().describe("What the human counsellor should do next, in English"),
    }),
    run: async (input) => {
      lead.intent_score = input.intent_score;
      lead.tier = tierFor(input.intent_score);
      lead.objections = Array.from(new Set([...lead.objections, ...input.objections])).slice(0, 8);
      lead.interests = Array.from(new Set([...lead.interests, ...input.interests])).slice(0, 8);
      lead.summary = input.summary;
      lead.next_action = input.next_action;
      if (lead.stage === "new") lead.stage = "engaged";
      await saveLead(lead);
      return "Saved.";
    },
  });

  const callbackTool = betaZodTool({
    name: "request_counsellor_callback",
    description:
      "Book a free callback from a NIAT counsellor once the family agrees. This also sends them a personalised WhatsApp confirmation in their language.",
    inputSchema: z.object({
      preferred_time: z.string().describe("When they want the call, as they said it, e.g. 'tomorrow 6pm'"),
      reason: z.string().describe("Main thing they want answered on the call, in English"),
    }),
    run: async ({ preferred_time, reason }) => {
      lead.callback_time = preferred_time;
      lead.stage = "callback_requested";
      lead.intent_score = Math.max(lead.intent_score, 85);
      lead.tier = tierFor(lead.intent_score);
      lead.next_action = `Call at ${preferred_time}: ${reason}`;
      await saveLead(lead);
      const updated = await generateAndSendFollowup(lead);
      Object.assign(lead, updated);
      return `Callback booked for ${preferred_time}. WhatsApp confirmation: ${updated.followup_status}.`;
    },
  });

  // ---- conversation history (stored server-side; text only) ----
  const profile =
    `[Family profile from the sign-up form]\n` +
    `Name: ${lead.name} | Filling in as: ${lead.role} | Preferred language: ${LANGUAGE_NAMES[lead.language]}\n` +
    `Exam: ${EXAM_LABELS[lead.exam] ?? lead.exam} | Rank: ${lead.rank ?? "not out yet"} | Category: ${lead.category} | Home state: ${lead.state}`;

  const messages: Anthropic.Beta.BetaMessageParam[] = lead.transcript.map((t, i) => ({
    role: t.role,
    content: i === 0 ? `${profile}\n\n${t.text}` : t.text,
  }));
  messages.push({
    role: "user",
    content: messages.length === 0 ? `${profile}\n\n${userText}` : userText,
  });

  const final = await client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    max_iterations: 8,
    ...FALLBACK,
    output_config: { effort: "medium" },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    tools: [findCollegesTool, niatFactsTool, insightsTool, callbackTool],
    messages,
  });

  let reply = textOf(final.content);
  if (final.stop_reason === "refusal" || !reply) {
    reply = "Sorry, I couldn't answer that. A RankPath counsellor can help; type 'callback' to book one.";
  }

  const now = new Date().toISOString();
  lead.transcript.push({ role: "user", text: userText, at: now }, { role: "assistant", text: reply, at: now });
  await saveLead(lead);
  return { reply, lead };
}
