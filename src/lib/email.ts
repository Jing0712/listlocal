import "server-only";
import nodemailer from "nodemailer";
import { isProd, optionalEnv } from "./env";

/** The provider refused or failed to send. `detail` is for server logs only (it can contain account info). */
export type EmailFailure = "config" | "auth" | "network" | "rejected" | "unknown";

export class EmailError extends Error {
  constructor(readonly detail: string, readonly kind: EmailFailure = "unknown") {
    super("The email service could not send this message");
    this.name = "EmailError";
  }
}

/** Safe, secret-free explanation of a failure, for the person setting the app up. */
export function describeEmailFailure(kind: EmailFailure, provider = emailProvider()): string {
  switch (kind) {
    case "config":
      return "No email provider is configured on the server.";
    case "auth":
      return provider === "gmail"
        ? "Gmail rejected the sender login. Check that GMAIL_USER is the account that created GMAIL_APP_PASSWORD, and that the app password is current."
        : "The email provider rejected the API key.";
    case "network":
      return `The server could not connect to ${provider === "gmail" ? "Gmail (smtp.gmail.com)" : "the email provider"}.`;
    case "rejected":
      return provider === "resend"
        ? "Resend refused this recipient. Its test sender only delivers to the Resend account owner."
        : "The email provider refused this message.";
    default:
      return "The email provider returned an unexpected error. See the server logs (email.failed).";
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
    if (isProd()) throw new EmailError("No email provider configured (set GMAIL_USER/GMAIL_APP_PASSWORD or RESEND_API_KEY)", "config");
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
    const kind: EmailFailure = res.status === 401 ? "auth" : res.status === 403 || res.status === 422 ? "rejected" : "unknown";
    console.error(JSON.stringify({ level: "error", event: "email.failed", provider: "resend", kind, to: mask(msg.to), detail }));
    throw new EmailError(detail, kind);
  }
}

let gmail: nodemailer.Transporter | undefined;

async function sendViaGmail(msg: Message) {
  const user = optionalEnv("GMAIL_USER").trim();
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
    const err = e as Error & { code?: string; responseCode?: number };
    const detail = `Gmail SMTP error: ${err.code ?? ""} ${err.responseCode ?? ""} ${err.message.slice(0, 300)}`;
    const kind: EmailFailure =
      err.code === "EAUTH" || err.responseCode === 535 || err.responseCode === 534
        ? "auth"
        : ["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ECONNREFUSED"].includes(err.code ?? "")
          ? "network"
          : err.responseCode && err.responseCode >= 550
            ? "rejected"
            : "unknown";
    gmail = undefined; // rebuild the transport next time in case credentials changed
    console.error(JSON.stringify({ level: "error", event: "email.failed", provider: "gmail", kind, to: mask(msg.to), detail }));
    throw new EmailError(detail, kind);
  }
}
