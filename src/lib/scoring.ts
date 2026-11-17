import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { client, MODEL, FALLBACK } from "./claude";
import { getLead, saveLead, tierFor } from "./store";

const Insights = z.object({
  intent_score: z.number().int().min(0).max(100),
  objections: z.array(z.string()).describe("Short English labels, e.g. 'not a real university?', 'fees', 'distance from home'"),
  interests: z.array(z.string()).describe("Short English labels, e.g. 'CSE', 'AI/ML', 'Hyderabad', 'placements'"),
  summary: z.string().describe("1-2 sentence English summary for the counsellor"),
  next_action: z.string().describe("What the human counsellor should do next, in English"),
});

/**
 * Reads the conversation so far and updates the lead's CRM fields (intent score, tier,
 * objections, interests, summary, next action). Runs after the chat reply is sent, so it
 * never delays the family or interferes with the visible answer.
 */
export async function scoreLead(leadId: string): Promise<void> {
  const lead = await getLead(leadId);
  if (!lead || lead.transcript.length === 0) return;

  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    ...FALLBACK,
    output_config: { effort: "low", format: betaZodOutputFormat(Insights) },
    system:
      "You are a CRM analyst for RankPath, an admissions counselling service working with NIAT. Read the conversation between the AI counsellor and a family and score the lead. " +
      "Intent score: 0-30 just browsing; 30-60 engaged and exploring; 60-80 seriously considering NIAT; 80-100 asked for a callback, fees or how to apply. " +
      "Objections and interests are short English labels; reuse the existing labels where they mean the same thing instead of adding near-duplicates.",
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          profile: { role: lead.role, exam: lead.exam, rank: lead.rank, category: lead.category, state: lead.state },
          existing_labels: { objections: lead.objections, interests: lead.interests },
          callback_booked_for: lead.callback_time,
          conversation: lead.transcript.map((t) => `${t.role === "user" ? "Family" : "Counsellor"}: ${t.text}`),
        }),
      },
    ],
  });

  const out = res.parsed_output;
  if (!out) return;

  // Re-read just before saving so we don't overwrite a chat turn that finished meanwhile.
  const fresh = (await getLead(leadId)) ?? lead;
  fresh.intent_score = fresh.callback_time ? Math.max(out.intent_score, 85) : out.intent_score;
  fresh.tier = tierFor(fresh.intent_score);
  fresh.objections = Array.from(new Set([...fresh.objections, ...out.objections])).slice(0, 8);
  fresh.interests = Array.from(new Set([...fresh.interests, ...out.interests])).slice(0, 8);
  fresh.summary = out.summary;
  if (!fresh.callback_time) fresh.next_action = out.next_action;
  if (fresh.stage === "new") fresh.stage = "engaged";
  await saveLead(fresh);
}
