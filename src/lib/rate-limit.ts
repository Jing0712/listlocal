import "server-only";
import { collections } from "./db";
import { HttpError } from "./http";

/**
 * Fixed-window rate limit stored in MongoDB. Serverless functions don't share
 * memory, so an in-process counter would not limit anything on Vercel.
 */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  const { rateLimits } = await collections();
  const windowStart = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  const id = `${key}:${windowStart}`;
  const doc = await rateLimits.findOneAndUpdate(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((windowStart + windowSec) * 1000) } },
    { upsert: true, returnDocument: "after" },
  );
  if (doc && doc.count > limit) {
    const retryAfter = windowStart + windowSec - Math.floor(Date.now() / 1000);
    throw new HttpError(429, `操作太频繁，请 ${retryAfter} 秒后再试`, { retryAfterSec: retryAfter });
  }
}
