import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";

export type Language = "en" | "hi" | "te" | "ta" | "kn" | "ml";
export type Tier = "hot" | "warm" | "cold";
export type Stage = "new" | "engaged" | "callback_requested" | "followed_up";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  at: string;
}

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  phone: string;
  role: "student" | "parent";
  language: Language;
  state: string;
  exam: string;
  rank: number | null;
  category: string;
  intent_score: number;
  tier: Tier;
  stage: Stage;
  objections: string[];
  interests: string[];
  summary: string;
  next_action: string;
  callback_time: string | null;
  transcript: ChatTurn[];
  followup_message: string | null;
  followup_status: "none" | "sent" | "simulated" | "failed";
}

export function tierFor(score: number): Tier {
  return score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
}

// ---------- backend selection ----------
let supabase: SupabaseClient | null = null;
function sb(): SupabaseClient | null {
  if (process.env.LEAD_STORAGE === "local") return null; // force the JSON-file store
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Server-only secret key (new "sb_secret_..." format, or the legacy service_role JWT).
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase ??= createClient(url, key, { auth: { persistSession: false } });
  return supabase;
}

// Local fallback: JSON file. On Vercel only /tmp is writable (and it is ephemeral).
const FILE = process.env.VERCEL
  ? "/tmp/leads.json"
  : path.join(process.cwd(), "data", "leads.local.json");

async function readFile(): Promise<Lead[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Lead[];
  } catch {
    return [];
  }
}
async function writeFile(leads: Lead[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(leads, null, 2));
}

export const storageMode = () => (sb() ? "supabase" : "local-file");

// ---------- API ----------
export async function saveLead(lead: Lead): Promise<Lead> {
  lead.updated_at = new Date().toISOString();
  const client = sb();
  if (client) {
    const { error } = await client.from("leads").upsert({ id: lead.id, data: lead, updated_at: lead.updated_at });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
    return lead;
  }
  const leads = await readFile();
  const i = leads.findIndex((l) => l.id === lead.id);
  if (i >= 0) leads[i] = lead;
  else leads.push(lead);
  await writeFile(leads);
  return lead;
}

export async function getLead(id: string): Promise<Lead | null> {
  const client = sb();
  if (client) {
    const { data, error } = await client.from("leads").select("data").eq("id", id).maybeSingle();
    if (error) throw new Error(`Supabase read failed: ${error.message}`);
    return (data?.data as Lead) ?? null;
  }
  return (await readFile()).find((l) => l.id === id) ?? null;
}

export async function listLeads(): Promise<Lead[]> {
  const client = sb();
  let leads: Lead[];
  if (client) {
    const { data, error } = await client.from("leads").select("data").order("updated_at", { ascending: false }).limit(500);
    if (error) throw new Error(`Supabase list failed: ${error.message}`);
    leads = (data ?? []).map((r) => r.data as Lead);
  } else {
    leads = await readFile();
  }
  return leads.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
