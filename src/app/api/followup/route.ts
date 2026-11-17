import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAndSendFollowup } from "@/lib/followup";
import { getLead } from "@/lib/store";

export const maxDuration = 60;

// Triggered from the dashboard: "send AI follow-up" for leads that went quiet.
export async function POST(req: Request) {
  const parsed = z.object({ leadId: z.string().uuid() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const lead = await getLead(parsed.data.leadId);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!lead.summary) lead.summary = "Family filled the form but has not chatted yet.";
  const updated = await generateAndSendFollowup(lead);
  return NextResponse.json({ status: updated.followup_status, message: updated.followup_message });
}
