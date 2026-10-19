import "server-only";
import type { ObjectId } from "mongodb";
import { collections, type UserDoc } from "./db";
import { numberEnv } from "./env";
import { HttpError } from "./http";

export const freeLimit = () => numberEnv("FREE_LISTING_LIMIT", 3);

export function quotaOf(user: Pick<UserDoc, "plan" | "listingsUsed">) {
  const limit = user.plan === "pro" ? null : freeLimit();
  return {
    plan: user.plan,
    used: user.listingsUsed,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - user.listingsUsed),
  };
}

/**
 * Atomically reserves one generation. The condition and the increment happen in
 * one MongoDB update, so two parallel requests can't both use the last free slot.
 */
export async function reserveGeneration(userId: ObjectId) {
  const { users } = await collections();
  const res = await users.findOneAndUpdate(
    { _id: userId, $or: [{ plan: "pro" }, { listingsUsed: { $lt: freeLimit() } }] },
    { $inc: { listingsUsed: 1 } },
    { returnDocument: "after" },
  );
  if (!res) {
    throw new HttpError(402, `The free plan includes ${freeLimit()} listings. Upgrade to Pro for unlimited listings.`, { code: "quota_exceeded" });
  }
}

/** Gives the slot back when generation failed, so users never pay for our errors. */
export async function refundGeneration(userId: ObjectId) {
  const { users } = await collections();
  await users.updateOne({ _id: userId, listingsUsed: { $gt: 0 } }, { $inc: { listingsUsed: -1 } });
}
