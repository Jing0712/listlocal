import "server-only";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { collections, type UserDoc } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, signSession, verifySession } from "./jwt";

export async function startSession(userId: string) {
  const token = await signSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Current user from the session cookie, or null. Always re-reads the DB so plan/verification are fresh. */
export async function currentUser(): Promise<UserDoc | null> {
  const id = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id || !ObjectId.isValid(id)) return null;
  const { users } = await collections();
  return users.findOne({ _id: new ObjectId(id) });
}

/** For API routes: 401 if not logged in, 403 if email not verified (unless allowed). */
export async function requireUser(opts: { allowUnverified?: boolean } = {}): Promise<UserDoc> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Log in first");
  if (!user.emailVerified && !opts.allowUnverified) throw new HttpError(403, "Verify your email first");
  return user;
}
