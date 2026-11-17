"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import type { Lead } from "@/lib/store";
import { LANGUAGE_NAMES } from "@/lib/languages";

const TIER_STYLE: Record<string, string> = {
  hot: "text-[var(--hot)] border-[var(--hot)]",
  warm: "text-[var(--warm)] border-[var(--warm)]",
  cold: "text-[var(--cold)] border-[var(--cold)]",
};
const TIER_ICON: Record<string, string> = { hot: "▲", warm: "●", cold: "▽" };

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-xs text-ink-2">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-2">{sub}</div>}
    </div>
  );
}

function Bars({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 text-sm font-medium">{title}</div>
      {rows.length === 0 && <div className="text-xs text-ink-2">No data yet</div>}
      <div className="space-y-2">
        {rows.map(([label, n]) => (
          <div key={label} className="group" title={`${label}: ${n}`}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span className="text-ink-2 group-hover:text-ink">{label}</span>
              <span className="tabular-nums">{n}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--line)]">
              <div className="h-2 rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const count = (items: string[]) =>
  Object.entries(items.reduce<Record<string, number>>((acc, k) => ((acc[k] = (acc[k] ?? 0) + 1), acc), {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [storage, setStorage] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");

  const load = useCallback(async () => {
    const res = await fetch("/api/leads", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads);
      setStorage(data.storage);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  async function followup(id: string) {
    setSending(id);
    await fetch("/api/followup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id }) });
    setSending(null);
    load();
  }

  const shown = filter === "all" ? leads : leads.filter((l) => l.tier === filter);
  const hot = leads.filter((l) => l.tier === "hot").length;
  const callbacks = leads.filter((l) => l.callback_time).length;
  const whatsapp = leads.filter((l) => l.followup_status === "sent" || l.followup_status === "simulated").length;
  const engaged = leads.filter((l) => l.transcript.length >= 4).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">RankPath · Counsellor dashboard</h1>
          <p className="text-sm text-ink-2">Live leads from the AI counsellor. Refreshes every 5s · storage: {storage || "…"}</p>
        </div>
        <a href="/" className="text-sm text-accent underline">Open counsellor →</a>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="Leads captured" value={leads.length} />
        <Tile label="Engaged (2+ turns)" value={engaged} sub={leads.length ? `${Math.round((engaged / leads.length) * 100)}% of leads` : undefined} />
        <Tile label="Hot leads" value={hot} sub="intent ≥ 70" />
        <Tile label="Callbacks booked" value={callbacks} sub={leads.length ? `${Math.round((callbacks / leads.length) * 100)}% conversion` : undefined} />
        <Tile label="WhatsApp follow-ups" value={whatsapp} />
      </section>

      <section className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Bars title="Leads by language" rows={count(leads.map((l) => LANGUAGE_NAMES[l.language]?.split(" (")[0] ?? l.language))} />
        <Bars title="Top objections (from AI)" rows={count(leads.flatMap((l) => l.objections))} />
        <Bars title="Top interests (from AI)" rows={count(leads.flatMap((l) => l.interests))} />
      </section>

      <section className="mt-5">
        <div className="mb-2 flex gap-1.5">
          {(["all", "hot", "warm", "cold"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs capitalize ${filter === f ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-ink-2"}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs text-ink-2">
              <tr>
                <th className="p-3">Lead</th><th className="p-3">Exam · rank</th><th className="p-3">Intent</th>
                <th className="p-3">Stage</th><th className="p-3">Next action (AI)</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-ink-2">No leads yet. Open the counsellor and try it.</td></tr>
              )}
              {shown.map((l) => (
                <Fragment key={l.id}>
                  <tr className="cursor-pointer border-b border-line align-top hover:bg-bg" onClick={() => setOpen(open === l.id ? null : l.id)}>
                    <td className="p-3">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-ink-2">{l.role} · {LANGUAGE_NAMES[l.language]?.split(" (")[0]} · {l.phone}</div>
                    </td>
                    <td className="p-3 tabular-nums">{l.exam.replace("_", " ")} · {l.rank ?? "awaited"}<div className="text-xs text-ink-2">{l.category} · {l.state}</div></td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${TIER_STYLE[l.tier]}`}>
                        {TIER_ICON[l.tier]} {l.tier} · {l.intent_score}
                      </span>
                    </td>
                    <td className="p-3 text-xs">{l.stage.replace("_", " ")}{l.callback_time && <div className="text-ink-2">📞 {l.callback_time}</div>}</td>
                    <td className="max-w-xs p-3 text-xs text-ink-2">{l.next_action || "-"}</td>
                    <td className="p-3">
                      <button onClick={(e) => { e.stopPropagation(); followup(l.id); }} disabled={sending === l.id}
                        className="whitespace-nowrap rounded-lg border border-line px-2.5 py-1 text-xs hover:border-accent disabled:opacity-50">
                        {sending === l.id ? "Writing…" : l.followup_message ? "Re-send WhatsApp" : "AI WhatsApp follow-up"}
                      </button>
                    </td>
                  </tr>
                  {open === l.id && (
                    <tr className="border-b border-line bg-bg">
                      <td colSpan={6} className="p-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <div className="text-xs font-medium text-ink-2">AI summary</div>
                            <p className="mt-1 text-sm">{l.summary || "-"}</p>
                            <div className="mt-3 text-xs font-medium text-ink-2">Objections</div>
                            <p className="mt-1 text-sm">{l.objections.join(", ") || "-"}</p>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-ink-2">WhatsApp ({l.followup_status})</div>
                            <p className="mt-1 whitespace-pre-wrap rounded-xl bg-surface p-3 text-sm">{l.followup_message || "Not sent yet"}</p>
                          </div>
                          <div className="max-h-72 overflow-y-auto">
                            <div className="text-xs font-medium text-ink-2">Transcript</div>
                            {l.transcript.map((t, i) => (
                              <p key={i} className="mt-1 text-xs"><b>{t.role === "user" ? "Family" : "AI"}:</b> {t.text}</p>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
