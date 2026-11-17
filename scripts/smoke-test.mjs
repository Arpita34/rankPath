// End-to-end test: a Telugu-speaking parent goes from form -> chat -> callback -> WhatsApp.
// Usage (with `npm run dev` running):  node scripts/smoke-test.mjs [baseUrl]
const BASE = process.argv[2] ?? "http://localhost:3000";

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const { id } = await post("/api/leads", {
  name: "Smoke Test Sai", phone: "9000000001", role: "parent", language: "te",
  state: "Telangana", exam: "TG_EAPCET", rank: 7200, category: "OPEN",
});
console.log("lead", id);

const turns = [
  "నా ర్యాంక్ 7200. నాకు ఏ కాలేజీలు వస్తాయి?",
  "మా అబ్బాయికి CSE కావాలి, AI అంటే ఇష్టం. NIAT అంటే ఏమిటి?",
  "NIAT యూనివర్సిటీ కాదా? డిగ్రీ నిజమైనదేనా?",
  "సరే, రేపు సాయంత్రం 6 గంటలకు కౌన్సెలర్ కాల్ చేయండి.",
];

for (const msg of turns) {
  const t0 = Date.now();
  const r = await post("/api/chat", { leadId: id, message: msg });
  console.log(`\n> ${msg}\n< ${r.reply}\n  [${r.lead.tier} ${r.lead.intent_score} | ${r.lead.stage} | whatsapp: ${r.lead.followup_status} | ${Date.now() - t0}ms]`);
}

// Lead scoring runs in the background after each reply; give the last one time to land.
await new Promise((r) => setTimeout(r, 10000));
const { leads } = await (await fetch(BASE + "/api/leads")).json();
const lead = leads.find((l) => l.id === id);
console.log("\nCRM record:", {
  tier: lead.tier, intent: lead.intent_score, stage: lead.stage, callback: lead.callback_time,
  objections: lead.objections, interests: lead.interests, next_action: lead.next_action,
});
console.log("\nWhatsApp message:\n" + lead.followup_message);

const ok = lead.stage === "followed_up" && lead.callback_time && lead.followup_message;
console.log(ok ? "\nPASS: full funnel worked" : "\nFAIL: funnel did not complete");
process.exit(ok ? 0 : 1);
