import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/auth/verification";
import { route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const POST = route(async () => {
  const user = await requireUser({ allowUnverified: true });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });
  await rateLimit(`resend:${user._id.toHexString()}`, 3, 3600);
  await sendVerificationEmail(user._id, user.email);
  return NextResponse.json({ ok: true });
});
