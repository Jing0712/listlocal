import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { collections } from "@/lib/db";
import { clientIp, HttpError, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/auth/verification";
import { startSession } from "@/lib/auth/session";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const POST = route(async (req: Request) => {
  await rateLimit(`signup:${clientIp(req)}`, 10, 3600);
  const { email, password } = Body.parse(await readJson(req));
  const { users } = await collections();

  const passwordHash = await bcrypt.hash(password, 10);
  let userId;
  try {
    const res = await users.insertOne({
      email,
      passwordHash,
      emailVerified: false,
      createdAt: new Date(),
      plan: "free",
      listingsUsed: 0,
    });
    userId = res.insertedId;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new HttpError(409, "This email is already registered. Log in instead.");
    throw e;
  }

  await sendVerificationEmail(userId, email);
  // Logged in but unverified: they can see the "check your email" page and resend, nothing else.
  await startSession(userId.toHexString());
  return NextResponse.json({ ok: true, email }, { status: 201 });
});
