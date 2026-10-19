import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email";

const TTL_MS = 24 * 60 * 60 * 1000;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Creates a one-time token (only its hash is stored) and emails the verification link. */
export async function sendVerificationEmail(userId: ObjectId, email: string) {
  const { tokens } = await collections();
  await tokens.deleteMany({ userId, purpose: "verify-email" });
  const token = randomBytes(32).toString("base64url");
  await tokens.insertOne({
    userId,
    tokenHash: hash(token),
    purpose: "verify-email",
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  const link = `${appUrl()}/api/auth/verify?token=${token}`;
  await sendEmail({
    to: email,
    subject: "验证你的 ListLocal 邮箱 / Verify your email",
    html: `<p>欢迎使用 ListLocal！</p><p>点击下面的链接验证邮箱（24 小时内有效）：</p><p><a href="${link}">${link}</a></p><p>如果不是你本人注册，请忽略这封邮件。</p>`,
    devLink: link,
  });
}

/** Consumes a token. Returns the user id it belonged to, or null if invalid/expired/used. */
export async function consumeVerificationToken(token: string): Promise<ObjectId | null> {
  const { tokens, users } = await collections();
  const doc = await tokens.findOneAndDelete({ tokenHash: hash(token), purpose: "verify-email" });
  if (!doc || doc.expiresAt.getTime() < Date.now()) return null;
  await users.updateOne({ _id: doc.userId }, { $set: { emailVerified: true } });
  return doc.userId;
}
