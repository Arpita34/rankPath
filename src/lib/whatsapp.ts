// Sends WhatsApp messages through the Twilio API. Without Twilio credentials it runs in
// "simulated" mode: the message is generated and stored, but not sent.

export async function sendWhatsApp(
  toPhone: string,
  body: string,
): Promise<{ status: "sent" | "simulated" | "failed"; detail: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886" (sandbox)
  if (!sid || !token || !from) {
    return { status: "simulated", detail: "Twilio not configured - message stored only." };
  }

  const digits = toPhone.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+") ? digits : `+91${digits.replace(/^0+/, "")}`;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: `whatsapp:${e164}`, Body: body }),
  });
  if (!res.ok) {
    return { status: "failed", detail: `Twilio ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  return { status: "sent", detail: "Delivered to Twilio." };
}
