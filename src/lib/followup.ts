import { client, MODEL, FALLBACK, textOf } from "./claude";
import { LANGUAGE_NAMES } from "./languages";
import { saveLead, type Lead } from "./store";
import { sendWhatsApp } from "./whatsapp";

/** Claude writes a personalised WhatsApp follow-up in the lead's language, then it is sent. */
export async function generateAndSendFollowup(lead: Lead): Promise<Lead> {
  const lang = LANGUAGE_NAMES[lead.language];
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2000,
    ...FALLBACK,
    output_config: { effort: "low" },
    system:
      "You write WhatsApp follow-up messages for RankPath, an admissions-guidance service that works with NIAT (NxtWave Institute of Advanced Technologies). " +
      "Write a warm, specific message of at most 90 words in the requested language and script. No markdown, at most one emoji, no invented facts, fees or dates. " +
      "Mention the student's rank and one concrete thing from the conversation, answer the main worry in one line, and end with a single clear next step (the confirmed callback time if there is one, otherwise reply YES to book a call). " +
      "Sign off as 'Team RankPath'. Output only the message text.",
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          language: lang,
          recipient: lead.role === "parent" ? `parent of the student (${lead.name})` : `student ${lead.name}`,
          exam: lead.exam,
          rank: lead.rank,
          interests: lead.interests,
          objections: lead.objections,
          conversation_summary: lead.summary,
          callback_time: lead.callback_time,
        }),
      },
    ],
  });

  const message =
    res.stop_reason === "refusal" ? "" : textOf(res.content);
  if (!message) {
    lead.followup_status = "failed";
    return saveLead(lead);
  }
  const sent = await sendWhatsApp(lead.phone, message);
  lead.followup_message = message;
  lead.followup_status = sent.status;
  if (sent.status !== "failed") lead.stage = "followed_up";
  return saveLead(lead);
}
