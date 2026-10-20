import "server-only";
import nodemailer from "nodemailer";
import { isProd, optionalEnv } from "./env";

/** The provider refused or failed to send. `detail` is for server logs only (it can contain account info). */
export class EmailError extends Error {
  constructor(readonly detail: string) {
    super("The email service could not send this message");
    this.name = "EmailError";
  }
}

type Message = { to: string; subject: string; html: string; devLink?: string };

/** Which provider is configured. Gmail wins if both are set. */
export function emailProvider(): "gmail" | "resend" | "none" {
  if (optionalEnv("GMAIL_USER") && optionalEnv("GMAIL_APP_PASSWORD")) return "gmail";
  if (optionalEnv("RESEND_API_KEY")) return "resend";
  return "none";
}

const mask = (to: string) => to.replace(/^(.).*(@.*)$/, "$1***$2");

/**
 * Sends one email.
 * - Gmail (SMTP + App Password): can send to any address, ~500/day. Good for a demo.
 * - Resend: needs a verified domain to send to anyone but the account owner.
 * Without either in development, the link is printed to the server log.
 * In production, no provider is an error.
 */
export async function sendEmail(msg: Message) {
  const provider = emailProvider();
  if (provider === "gmail") return sendViaGmail(msg);
  const key = optionalEnv("RESEND_API_KEY");
  if (!key) {
    if (isProd()) throw new EmailError("No email provider configured (set GMAIL_USER/GMAIL_APP_PASSWORD or RESEND_API_KEY)");
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
    console.error(JSON.stringify({ level: "error", event: "email.failed", to: mask(msg.to), detail }));
    throw new EmailError(detail);
  }
}

let gmail: nodemailer.Transporter | undefined;

async function sendViaGmail(msg: Message) {
  const user = optionalEnv("GMAIL_USER");
  if (!gmail) {
    gmail = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      // App passwords are shown with spaces; Gmail accepts them without.
      auth: { user, pass: optionalEnv("GMAIL_APP_PASSWORD").replace(/\s+/g, "") },
    });
  }
  try {
    await gmail.sendMail({ from: `ListLocal <${user}>`, to: msg.to, subject: msg.subject, html: msg.html });
  } catch (e) {
    const detail = `Gmail SMTP error: ${(e as Error).message.slice(0, 300)}`;
    console.error(JSON.stringify({ level: "error", event: "email.failed", provider: "gmail", to: mask(msg.to), detail }));
    throw new EmailError(detail);
  }
}
