# RankPath: Rank → Right College, an AI counsellor for NIAT

A multilingual AI admission counsellor that catches 12th-grade students and parents in the
week JEE Main / EAPCET / KCET results come out. It shows them, honestly, where their rank gets
them, introduces NIAT where it fits, handles objections, books a counsellor callback and
follows up on WhatsApp in their language.

## How the system fits together

```
[1] Landing page + intake form (6 languages)        src/app/page.tsx
        │  POST /api/leads
        ▼
[2] Claude agent (tool-calling loop)                 src/lib/agent.ts
     tools:
       find_colleges_for_rank  → public cutoff data  data/cutoffs.json, scripts/scrape_cutoffs.py
       get_niat_facts          → NIAT knowledge base  src/lib/niat.ts (from niatindia.com)
       update_lead_insights    → intent score, objections, next action → CRM
       request_counsellor_callback → books the call + triggers [4]
        ▼
[3] Lead store (Supabase, or a local JSON file)     src/lib/store.ts
        ▼
[4] Claude-written WhatsApp follow-up → Twilio      src/lib/followup.ts, src/lib/whatsapp.ts
        ▼
[5] Live counsellor dashboard                        src/app/dashboard/page.tsx
     tiles, language/objection breakdowns, transcripts, one-click AI follow-up for quiet leads
```

Model: `claude-opus-5-5` through the Anthropic TypeScript SDK tool runner, with server-side
refusal fallbacks and prompt caching on the system prompt.

## Run locally

```bash
cp .env.example .env.local     # then add your ANTHROPIC_API_KEY
npm install
npm run dev                    # http://localhost:3000  and  /dashboard
```

Only `ANTHROPIC_API_KEY` is required. Without Supabase, leads go to `data/leads.local.json`.
Without Twilio, WhatsApp messages are generated and shown as "simulated" on the dashboard.

## Deploy (Vercel)

1. Supabase: create a project, run `supabase/schema.sql` in the SQL editor, and copy the project URL and the **secret** key (`sb_secret_...`, under Project Settings → API Keys) into `SUPABASE_URL` / `SUPABASE_SECRET_KEY`.
2. Push this folder to GitHub, then import it at vercel.com/new.
3. Add the env vars from `.env.example` in Vercel → Settings → Environment Variables.
4. Deploy. Share `/` (the counsellor) and `/dashboard`.

## Real cutoff data

`data/cutoffs.json` ships with approximate seed closing ranks. To load official numbers, download
the last-rank PDF or CSV from the official counselling site and run:

```bash
pip install pdfplumber
python -I scripts/scrape_cutoffs.py --exam TG_EAPCET --pdf last_rank.pdf
```
