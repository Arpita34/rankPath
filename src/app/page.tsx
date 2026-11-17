"use client";

import { useEffect, useRef, useState } from "react";
import { UI } from "@/lib/i18n";
import { EXAM_LABELS, LANGUAGE_NAMES } from "@/lib/languages";
import type { Language } from "@/lib/store";
import { Markdown } from "@/components/Markdown";

type Msg = { role: "user" | "assistant"; text: string };

const LANGS = Object.keys(LANGUAGE_NAMES) as Language[];
const STATES = ["Telangana", "Andhra Pradesh", "Karnataka", "Tamil Nadu", "Kerala", "Maharashtra", "Uttar Pradesh", "Other"];

export default function Home() {
  const [lang, setLang] = useState<Language>("en");
  const t = UI[lang];

  const [form, setForm] = useState({
    name: "", phone: "", role: "student" as "student" | "parent",
    state: "Telangana", exam: "TG_EAPCET", rank: "", category: "OPEN",
  });
  const [leadId, setLeadId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tier: string; stage: string; followup_status: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Synchronous lock: React state updates are async, so a fast double-click would
  // otherwise get past the `busy` check twice and send the message twice.
  const inFlight = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text: string, id = leadId) {
    if (!id || !text.trim() || inFlight.current) return;
    inFlight.current = true;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMsgs((m) => [...m, { role: "assistant", text: data.reply }]);
      setStatus(data.lead);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const starting = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (starting.current) return; // block double-submit (would create two leads)
    starting.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const rank = form.rank ? parseInt(form.rank, 10) : null;
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rank, language: lang }),
      });
      const data = await res.json();
      if (!res.ok) { setError("Please check the form fields."); return; }
      setLeadId(data.id);
      send(t.firstMessage(rank), data.id);
    } catch {
      setError("Network error, please try again.");
    } finally {
      starting.current = false;
      setSubmitting(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-semibold tracking-tight">
          Rank<span className="text-accent">Path</span>
          <span className="ml-2 text-xs font-normal text-ink-2">with NIAT</span>
        </div>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Language">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              disabled={!!leadId}
              aria-pressed={lang === l}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                lang === l ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-ink-2 hover:text-ink"
              } disabled:opacity-60`}
            >
              {LANGUAGE_NAMES[l].split(" (")[1]?.replace(")", "") ?? "English"}
            </button>
          ))}
        </div>
      </header>

      {!leadId ? (
        <section>
          <p className="text-sm font-medium text-accent">{t.tagline}</p>
          <h1 className="mt-1 text-2xl font-semibold leading-snug sm:text-3xl">{t.title}</h1>
          <p className="mt-2 text-ink-2">{t.subtitle}</p>

          <form onSubmit={start} className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2">
            <label className="text-sm">{t.name}<input required className="field mt-1" value={form.name} onChange={set("name")} /></label>
            <label className="text-sm">{t.phone}<input required inputMode="tel" pattern="[0-9+ ]{8,15}" className="field mt-1" value={form.phone} onChange={set("phone")} placeholder="98xxxxxxxx" /></label>
            <label className="text-sm">{t.iam}
              <select className="field mt-1" value={form.role} onChange={set("role")}>
                <option value="student">{t.student}</option><option value="parent">{t.parent}</option>
              </select>
            </label>
            <label className="text-sm">{t.state}
              <select className="field mt-1" value={form.state} onChange={set("state")}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label className="text-sm">{t.exam}
              <select className="field mt-1" value={form.exam} onChange={set("exam")}>
                {Object.entries(EXAM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="text-sm">{t.category}
              <select className="field mt-1" value={form.category} onChange={set("category")}>
                {["OPEN", "EWS", "OBC", "SC", "ST"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">{t.rank}
              <input inputMode="numeric" pattern="[0-9]*" className="field mt-1" value={form.rank} onChange={set("rank")} placeholder="e.g. 12450" />
              <span className="mt-1 block text-xs text-ink-2">{t.rankHint}</span>
            </label>
            <button disabled={submitting} className="rounded-xl bg-accent px-4 py-3 font-medium text-accent-ink disabled:opacity-60 sm:col-span-2">{t.start}</button>
            <p className="text-xs text-ink-2 sm:col-span-2">{t.privacy}</p>
          </form>
          {error && <p className="mt-3 text-sm text-[var(--hot)]">{error}</p>}
        </section>
      ) : (
        <section className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pb-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                    m.role === "user" ? "bg-[var(--bubble-user)] text-[var(--bubble-user-ink)]" : "border border-line bg-surface"
                  }`}
                >
                  {m.role === "assistant" ? <Markdown text={m.text} /> : m.text}
                </div>
              </div>
            ))}
            {busy && <div className="text-sm text-ink-2">{t.thinking}</div>}
            {error && <div className="text-sm text-[var(--hot)]">{error}</div>}
            {status?.stage === "followed_up" && (
              <div className="rounded-xl bg-accent-soft px-3 py-2 text-sm">
                ✓ WhatsApp {status.followup_status === "sent" ? "sent" : "prepared (demo mode)"}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="sticky bottom-0 bg-bg pt-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {t.quick.map((q) => (
                <button key={q} onClick={() => send(q)} disabled={busy}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2 hover:text-ink disabled:opacity-50">
                  {q}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
              <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.placeholder} />
              <button disabled={busy} className="rounded-xl bg-accent px-4 font-medium text-accent-ink disabled:opacity-50">{t.send}</button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
