import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { client, MODEL, FALLBACK, textOf } from "./claude";
import { CATEGORIES, EXAMS, findColleges } from "./cutoffs";
import { NIAT_FACTS, NIAT_TOPICS } from "./niat";
import { LANGUAGE_NAMES, EXAM_LABELS } from "./languages";
import { getLead, saveLead, tierFor, type Lead } from "./store";
import { generateAndSendFollowup } from "./followup";

const SYSTEM = `You are "RankPath", a free, honest admission counsellor for Indian 12th-grade students and their parents in the week entrance-exam results come out. RankPath is run in partnership with NIAT (NxtWave Institute of Advanced Technologies).

## Ranks and exams
- If the family mentions a rank, exam or category in chat that differs from the sign-up form, the chat wins: use what they just said, and call find_colleges_for_rank again with it.
- Understand casual formats: "3k" = 3000, "15k" = 15000, "1.2 lakh" = 120000, "AIR 5000" = 5000. If the exam is unclear for a new rank, ask which exam it is.
- JEE Main ranks get NITs/IIITs/GFTIs via JoSAA. IITs need JEE Advanced; mention this only if they ask about IITs.
- If the tool returns rank_beyond_dataset, say honestly that this rank is beyond the colleges in your list, that more private colleges do admit at this rank in later counselling rounds, and suggest the official last-rank list. Never say "no college is possible".

## Your job, in order
1. Show the family where their rank realistically gets them. ALWAYS call find_colleges_for_rank before naming any college or cutoff. Present 3-5 options with safe/likely/borderline labels and approximate yearly fees. Say the cutoffs are approximate and to verify on the official counselling site.
2. Find out what matters to them: branch (CSE/AI?), city or staying near home, budget, placements, the parent's main worry.
3. Where it genuinely fits (for example the rank misses the CSE colleges they wanted, they care about AI/industry skills, or they want a job-ready path), introduce NIAT as one option, not the only one. Call get_niat_facts before stating anything about NIAT.
4. Handle objections honestly. Key truth: NIAT is NOT a university and does not award degrees. The B.Tech comes from a UGC/AICTE-recognised partner university, and NIAT adds the industry curriculum and certification. Never hide this; explain it clearly, especially to parents. NIAT fees are not published, so never quote a number; offer the callback. Placement numbers come with NIAT's disclaimer that enrolment does not guarantee a job.
5. When they show interest, offer a free counsellor callback or a chat with current NIAT students. If they agree and give a time, call request_counsellor_callback.

Note: earlier assistant turns in this conversation are stored as text only. Their tool calls are not shown, but any colleges, cutoffs or NIAT facts in them did come from the tools.

## Order of work in each turn
Call every tool you need first, then write your reply to the family as the very last thing. Text written before a tool call is not shown to the family, so never write the answer and then call a tool after it.

## Style
- Reply in the family's chosen language, in its native script (not transliterated), unless they write to you in another language; then switch to theirs. If they type an Indian language in Roman letters (Hinglish, "Tenglish" etc.), reply the same way, in Roman letters. Keep college names and numbers in English.
- At most 120 words per reply. Short paragraphs or a short list. Warm, like a knowledgeable elder cousin, never salesy.
- Ask at most one question per reply.
- Don't narrate tool use ("let me check…"); just give the answer.
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

  // Lead scoring is NOT an agent tool: on this model, reply text written before a tool call
  // comes back hidden, so a "save insights" call after the answer blanked the reply.
  // Scoring runs separately after the reply is sent (src/lib/scoring.ts).

  const callbackTool = betaZodTool({
    name: "request_counsellor_callback",
    description:
      "Book a free callback from a NIAT counsellor once the family agrees. This also sends them a personalised WhatsApp confirmation in their language.",
    inputSchema: z.object({
      preferred_time: z.string().describe("When they want the call, as they said it, e.g. 'tomorrow 6pm'"),
      reason: z.string().describe("Main thing they want answered on the call, in English"),
    }),
    run: async ({ preferred_time, reason }) => {
      // Already booked for this time and confirmed: don't send a second WhatsApp.
      const confirmed = lead.followup_status === "sent" || lead.followup_status === "simulated";
      if (confirmed && lead.callback_time?.trim().toLowerCase() === preferred_time.trim().toLowerCase()) {
        return `A callback is already booked for ${lead.callback_time} and the WhatsApp confirmation was sent earlier. Nothing new was sent.`;
      }
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
    `Exam: ${EXAM_LABELS[lead.exam] ?? lead.exam} | Rank: ${lead.rank ?? "not out yet"} | Category: ${lead.category} | Home state: ${lead.state}\n` +
    `Callback: ${lead.callback_time ? `already booked for "${lead.callback_time}" (confirmation sent); only call request_counsellor_callback again if they ask for a different time` : "not booked yet"}`;

  const messages: Anthropic.Beta.BetaMessageParam[] = lead.transcript.map((t, i) => ({
    role: t.role,
    content: i === 0 ? `${profile}\n\n${t.text}` : t.text,
  }));
  messages.push({
    role: "user",
    content: messages.length === 0 ? `${profile}\n\n${userText}` : userText,
  });

  const params = {
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: "medium" as const },
    system: [{ type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" as const } }],
    tools: [findCollegesTool, niatFactsTool, callbackTool],
  };

  // Run the tool loop and collect the visible text from every step.
  async function run(history: Anthropic.Beta.BetaMessageParam[], maxIterations: number) {
    const runner = client.beta.messages.toolRunner({ ...params, max_iterations: maxIterations, messages: history });
    const parts: string[] = [];
    let final: Anthropic.Beta.BetaMessage | undefined;
    for await (const message of runner) {
      const text = textOf(message.content);
      if (text) parts.push(text);
      final = message;
    }
    if (!final) throw new Error("Agent produced no message");
    return { text: parts.join("\n\n"), final, history: [...runner.params.messages] };
  }

  let { text: reply, final, history } = await run(messages, 8);

  // Safety net: if the turn still ended with no visible text, append (never rewrite) a
  // nudge and let the agent write its reply once more.
  if (!reply && final.stop_reason !== "refusal") {
    console.warn("[agent] empty reply, nudging once", { lead: lead.id, blocks: final.content.map((b) => b.type) });
    if (history.at(-1)?.role !== "assistant" && final.content.length > 0) {
      history.push({ role: "assistant", content: final.content });
    }
    history.push({
      role: "user",
      content: "[RankPath system note: your last reply did not reach the family. Write your complete reply to their last message now.]",
    });
    ({ text: reply, final } = await run(history, 3));
  }

  if (final.stop_reason === "refusal" || !reply) {
    console.warn("[agent] empty/refused reply", {
      lead: lead.id,
      stop_reason: final.stop_reason,
      stop_details: final.stop_details,
      blocks: final.content.map((b) => b.type),
    });
    reply = "Sorry, I couldn't answer that. A RankPath counsellor can help; type 'callback' to book one.";
  }

  // Background scoring (src/lib/scoring.ts) may have saved while this turn was running.
  // Take its fields from the stored copy so this save doesn't overwrite them.
  const stored = await getLead(lead.id);
  if (stored) {
    lead.objections = stored.objections;
    lead.interests = stored.interests;
    lead.summary = stored.summary;
    lead.intent_score = lead.callback_time ? Math.max(stored.intent_score, 85) : stored.intent_score;
    lead.tier = tierFor(lead.intent_score);
    if (!lead.callback_time) lead.next_action = stored.next_action;
    if (lead.stage === "new") lead.stage = stored.stage;
  }

  const now = new Date().toISOString();
  lead.transcript.push({ role: "user", text: userText, at: now }, { role: "assistant", text: reply, at: now });
  await saveLead(lead);
  return { reply, lead };
}
