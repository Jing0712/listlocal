import "server-only";
import { isProd, optionalEnv } from "./env";

/** The provider refused or failed to send. `detail` is for server logs only (it can contain account info). */
export class EmailError extends Error {
  constructor(readonly detail: string) {
    super("The email service could not send this message");
    this.name = "EmailError";
  }
}

/**
 * Sends mail through Resend's HTTP API.
 * Without RESEND_API_KEY in development, the link is printed to the server log
 * so the flow can be tested locally. In production a missing key is an error.
 */
export async function sendEmail(msg: { to: string; subject: string; html: string; devLink?: string }) {
  const key = optionalEnv("RESEND_API_KEY");
  if (!key) {
    if (isProd()) throw new EmailError("RESEND_API_KEY is not set");
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
    const detail = `Resend error ${res.status}: ${body.slice(0, 300)}`;
    console.error(JSON.stringify({ level: "error", event: "email.failed", to: msg.to.replace(/^(.).*(@.*)$/, "$1***$2"), detail }));
    throw new EmailError(detail);
  }
}
