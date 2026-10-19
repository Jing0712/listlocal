import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth/session";
import { route } from "@/lib/http";

export const POST = route(async () => {
  await endSession();
  return NextResponse.json({ ok: true });
});
