import { NextResponse } from "next/server";
import { collections } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { appUrl, requireEnv } from "@/lib/env";
import { HttpError, route } from "@/lib/http";
import { stripe } from "@/lib/stripe";

/** Starts a Stripe Checkout subscription session (test mode). The plan is only upgraded by the webhook. */
export const POST = route(async () => {
  const user = await requireUser();
  if (user.plan === "pro") throw new HttpError(409, "You are already on Pro");

  const s = stripe();
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await s.customers.create({ email: user.email, metadata: { userId: user._id.toHexString() } });
    customerId = customer.id;
    const { users } = await collections();
    await users.updateOne({ _id: user._id }, { $set: { stripeCustomerId: customerId } });
  }

  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: requireEnv("STRIPE_PRICE_ID"), quantity: 1 }],
    client_reference_id: user._id.toHexString(),
    metadata: { userId: user._id.toHexString() },
    subscription_data: { metadata: { userId: user._id.toHexString() } },
    success_url: `${appUrl()}/app/account?checkout=success`,
    cancel_url: `${appUrl()}/app/account?checkout=cancelled`,
  });
  if (!session.url) throw new HttpError(502, "Stripe did not return a checkout link");
  return NextResponse.json({ url: session.url });
});
