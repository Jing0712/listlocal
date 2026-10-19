import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { ObjectId } from "mongodb";
import { collections, type Plan } from "@/lib/db";
import { requireEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";

/**
 * Stripe → us. This is the ONLY place a plan changes, because the browser
 * redirect after checkout can be faked or never arrive.
 * - Signature is verified against the raw body.
 * - Each event id is stored once, so Stripe's retries are idempotent.
 */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig ?? "", requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${(e as Error).message}` }, { status: 400 });
  }

  const { stripeEvents, users } = await collections();
  try {
    await stripeEvents.insertOne({ _id: event.id, type: event.type, createdAt: new Date() });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return NextResponse.json({ received: true, duplicate: true });
    throw e;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id ?? s.metadata?.userId;
        if (userId && ObjectId.isValid(userId) && s.mode === "subscription") {
          await users.updateOne(
            { _id: new ObjectId(userId) },
            {
              $set: {
                plan: "pro",
                stripeCustomerId: typeof s.customer === "string" ? s.customer : s.customer?.id,
                stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : s.subscription?.id,
                subscriptionStatus: "active",
              },
            },
          );
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const plan: Plan = event.type === "customer.subscription.deleted" ? "free" : ["active", "trialing"].includes(sub.status) ? "pro" : "free";
        await users.updateOne(
          { stripeCustomerId: customerId },
          { $set: { plan, subscriptionStatus: sub.status, stripeSubscriptionId: sub.id } },
        );
        break;
      }
      default:
        break; // other events are acknowledged and ignored
    }
  } catch (e) {
    // Let Stripe retry: forget the event id so the retry isn't treated as a duplicate.
    await stripeEvents.deleteOne({ _id: event.id });
    console.error(JSON.stringify({ level: "error", event: "stripe.webhook.failed", type: event.type, msg: (e as Error).message }));
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
