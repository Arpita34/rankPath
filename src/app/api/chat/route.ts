import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runAgentTurn } from "@/lib/agent";
import { getLead } from "@/lib/store";

export const maxDuration = 60; // seconds (Vercel)

const Body = z.object({ leadId: z.string().uuid(), message: z.string().trim().min(1).max(2000) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const lead = await getLead(parsed.data.leadId);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.transcript.length >= 60) {
    return NextResponse.json({ error: "Conversation limit reached" }, { status: 429 });
  }

  try {
    const { reply, lead: updated } = await runAgentTurn(lead, parsed.data.message);
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
