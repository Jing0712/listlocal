import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/auth/verification";
import { HttpError, route } from "@/lib/http";
import { describeEmailFailure, EmailError } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const POST = route(async () => {
  const user = await requireUser({ allowUnverified: true });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });
  await rateLimit(`resend:${user._id.toHexString()}`, 5, 900);
  try {
    await sendVerificationEmail(user._id, user.email);
  } catch (e) {
    if (e instanceof EmailError) {
      throw new HttpError(502, `We couldn't send the email. ${describeEmailFailure(e.kind)}`, { reason: e.kind });
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
});
