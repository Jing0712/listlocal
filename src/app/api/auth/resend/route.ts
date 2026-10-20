import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/auth/verification";
import { HttpError, route } from "@/lib/http";
import { EmailError } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const POST = route(async () => {
  const user = await requireUser({ allowUnverified: true });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });
  await rateLimit(`resend:${user._id.toHexString()}`, 3, 3600);
  try {
    await sendVerificationEmail(user._id, user.email);
  } catch (e) {
    if (e instanceof EmailError) {
      throw new HttpError(502, "We couldn't send the email: our email service rejected it. Try again later or contact the ListLocal team.");
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
});
