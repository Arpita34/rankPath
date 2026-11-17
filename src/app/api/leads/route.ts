import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { listLeads, saveLead, storageMode, type Lead } from "@/lib/store";


const NewLead = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(8).max(20),
  role: z.enum(["student", "parent"]),
  language: z.enum(["en", "hi", "te", "ta", "kn", "ml"]),
  state: z.string().trim().min(1).max(40),
  exam: z.enum(["JEE_MAIN", "TG_EAPCET", "AP_EAPCET", "KCET"]),
  rank: z.number().int().positive().nullable(),
  category: z.enum(["OPEN", "EWS", "OBC", "SC", "ST"]),
});

export async function POST(req: Request) {
  const parsed = NewLead.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid form", issues: parsed.error.issues }, { status: 400 });
  }
  const now = new Date().toISOString();
  const lead: Lead = {
    ...parsed.data,
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
    intent_score: 20,
    tier: "cold",
    stage: "new",
    objections: [],
    interests: [],
    summary: "",
    next_action: "",
    callback_time: null,
    transcript: [],
    followup_message: null,
    followup_status: "none",
  };
  await saveLead(lead);
  return NextResponse.json({ id: lead.id });
}

export async function GET() {
  await connection(); // always run at request time (live data)
  // The dashboard is public for the demo, so phone numbers are masked.
  const leads = (await listLeads()).map((l) => ({ ...l, phone: `******${l.phone.slice(-4)}` }));
  return NextResponse.json({ storage: storageMode(), leads });
}
