import Anthropic from "@anthropic-ai/sdk";
import { after, NextResponse } from "next/server";
import { scoreLead } from "@/lib/scoring";
import { z } from "zod";
import { runAgentTurn } from "@/lib/agent";
import { getLead } from "@/lib/store";

export const maxDuration = 60; // seconds (Vercel)

const Body = z.object({ leadId: z.string().uuid(), message: z.string().trim().min(1).max(2000) });

// One turn at a time per lead (per server instance): a duplicate request that arrives
// while a reply is still being generated is rejected instead of answered twice.
const activeLeads = new Set<string>();

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { leadId } = parsed.data;

  if (activeLeads.has(leadId)) {
    return NextResponse.json({ error: "Still answering your previous message…" }, { status: 409 });
  }
  activeLeads.add(leadId);
  try {
    return await handle(leadId, parsed.data.message);
  } finally {
    activeLeads.delete(leadId);
  }
}

async function handle(leadId: string, message: string) {
  const lead = await getLead(leadId);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.transcript.length >= 60) {
    return NextResponse.json({ error: "Conversation limit reached" }, { status: 429 });
  }
  try {
    const { reply, lead: updated } = await runAgentTurn(lead, message);
    // Update the CRM score after the reply has been sent, so the family never waits for it.
    after(() => scoreLead(leadId).catch((e) => console.error("[scoring] failed", e)));
    return NextResponse.json({
      reply,
      lead: { intent_score: updated.intent_score, tier: updated.tier, stage: updated.stage, followup_status: updated.followup_status },
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Busy right now, please retry in a few seconds." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Server API key is invalid." }, { status: 500 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Claude API error", err.status, err.message);
      return NextResponse.json({ error: `AI service error (${err.status})` }, { status: 502 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
