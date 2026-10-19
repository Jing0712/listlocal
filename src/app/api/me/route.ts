import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { route } from "@/lib/http";
import { quotaOf } from "@/lib/quota";

export const GET = route(async () => {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: { email: user.email, emailVerified: user.emailVerified, ...quotaOf(user), subscriptionStatus: user.subscriptionStatus ?? null },
  });
});
