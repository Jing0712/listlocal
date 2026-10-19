// Edge-safe (used by middleware): no Node-only imports here.
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "ll_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set and at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(key());
}

/** Returns the user id, or null if the token is missing, expired or forged. */
export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
