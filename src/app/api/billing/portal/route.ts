import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import { HttpError, route } from "@/lib/http";
import { stripe } from "@/lib/stripe";

/** Stripe-hosted page where users can cancel or update their subscription. */
export const POST = route(async () => {
  const user = await requireUser();
  if (!user.stripeCustomerId) throw new HttpError(400, "还没有订阅记录");
  const portal = await stripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl()}/app/account`,
  });
  return NextResponse.json({ url: portal.url });
});
