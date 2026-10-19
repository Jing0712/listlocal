import "server-only";
import Stripe from "stripe";
import { requireEnv } from "./env";

let client: Stripe | undefined;

export function stripe(): Stripe {
  if (!client) {
    const key = requireEnv("STRIPE_SECRET_KEY");
    // Guard rail for a class project: refuse live keys outright.
    if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
      throw new Error("Only Stripe TEST-mode keys are allowed in this project");
    }
    client = new Stripe(key);
  }
  return client;
}
