import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";
import { optionalEnv } from "@/lib/env";
import { emailProvider } from "@/lib/email";

export const dynamic = "force-dynamic";

/** Reports which dependencies are configured — never their values. */
export async function GET() {
  const mongo = process.env.MONGODB_URI ? await pingDb() : false;
  const model = optionalEnv("ANTHROPIC_MODEL", "claude-sonnet-4-5").trim();
  const body = {
    ok: mongo,
    mongo: mongo ? "up" : "down",
    // Only echo the model id if it looks like one; a mis-pasted env var must never leak other values.
    model: /^[a-z0-9][a-z0-9.\-]{0,63}$/.test(model) ? model : "invalid ANTHROPIC_MODEL value",
    configured: {
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
      stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      email: emailProvider() !== "none",
      emailProvider: emailProvider(),
      sessionSecret: (process.env.SESSION_SECRET ?? "").length >= 32,
    },
  };
  return NextResponse.json(body, { status: mongo ? 200 : 503 });
}
