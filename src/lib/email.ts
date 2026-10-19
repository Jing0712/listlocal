import "server-only";
import { isProd, optionalEnv } from "./env";

/**
 * Sends mail through Resend's HTTP API.
 * Without RESEND_API_KEY in development, the link is printed to the server log
 * so the flow can be tested locally. In production a missing key is an error.
 */
export async function sendEmail(msg: { to: string; subject: string; html: string; devLink?: string }) {
  const key = optionalEnv("RESEND_API_KEY");
  if (!key) {
    if (isProd()) throw new Error("RESEND_API_KEY is not set; cannot send email");
    console.log(`[dev email] to=${msg.to} subject="${msg.subject}" link=${msg.devLink ?? "(none)"}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: optionalEnv("EMAIL_FROM", "ListLocal <onboarding@resend.dev>"),
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${body.slice(0, 200)}`);
  }
}
