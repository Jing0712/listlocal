import { NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/auth/verification";
import { startSession } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import { route } from "@/lib/http";

// The link in the email lands here; we redirect to a page instead of returning JSON.
export const GET = route(async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const userId = token ? await consumeVerificationToken(token) : null;
  if (!userId) return NextResponse.redirect(`${appUrl()}/verify-email?status=invalid`);
  await startSession(userId.toHexString());
  return NextResponse.redirect(`${appUrl()}/app?verified=1`);
});
