import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { collections } from "@/lib/db";
import { clientIp, HttpError, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { startSession } from "@/lib/auth/session";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

export const POST = route(async (req: Request) => {
  await rateLimit(`login:${clientIp(req)}`, 20, 900);
  const { email, password } = Body.parse(await readJson(req));
  const { users } = await collections();
  const user = await users.findOne({ email });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Email or password is incorrect");

  await startSession(user._id.toHexString());
  return NextResponse.json({ ok: true, emailVerified: user.emailVerified });
});
