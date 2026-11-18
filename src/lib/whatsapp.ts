// Sends WhatsApp messages through the Twilio API. Without Twilio credentials it runs in
// "simulated" mode: the message is generated and stored, but not sent.

export async function sendWhatsApp(
  toPhone: string,
  body: string,
): Promise<{ status: "sent" | "simulated" | "failed"; detail: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  // e.g. "whatsapp:+14155238886". Tolerate spaces and a missing "whatsapp:" prefix.
  const fromDigits = (process.env.TWILIO_WHATSAPP_FROM ?? "").replace(/\D/g, "");
  const from = fromDigits ? `whatsapp:+${fromDigits}` : "";
  if (!sid || !token || !from) {
    return { status: "simulated", detail: "Twilio not configured - message stored only." };
  }

  // Accept "+91 98765 43210", "919876543210", "09876543210" and "9876543210".
  const d = toPhone.replace(/\D/g, "").replace(/^0+/, "");
  const e164 = toPhone.trim().startsWith("+") || (d.length === 12 && d.startsWith("91")) ? `+${d}` : `+91${d}`;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: `whatsapp:${e164}`, Body: body }),
  });
  if (!res.ok) {
    const detail = `Twilio ${res.status}: ${(await res.text()).slice(0, 300)}`;
    console.error("[whatsapp] send failed", detail);
    return { status: "failed", detail };
  }
  return { status: "sent", detail: "Delivered to Twilio." };
}
