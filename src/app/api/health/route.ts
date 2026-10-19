import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";
import { optionalEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Reports which dependencies are configured — never their values. */
export async function GET() {
  const mongo = process.env.MONGODB_URI ? await pingDb() : false;
  const body = {
    ok: mongo,
    mongo: mongo ? "up" : "down",
    model: optionalEnv("ANTHROPIC_MODEL", "claude-sonnet-4-5"),
    configured: {
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
      stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      email: Boolean(process.env.RESEND_API_KEY),
      sessionSecret: (process.env.SESSION_SECRET ?? "").length >= 32,
    },
  };
  return NextResponse.json(body, { status: mongo ? 200 : 503 });
}
