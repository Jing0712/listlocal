import "server-only";

/** Read a required env var at call time (not import time) so `next build` works without secrets. */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new Error(`Missing required environment variable ${name}`);
  return v;
}

export function optionalEnv(name: string, fallback = ""): string {
  const v = process.env[name];
  return v && v.trim() !== "" ? v : fallback;
}

export function numberEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && process.env[name] !== "" && process.env[name] !== undefined ? v : fallback;
}

export function appUrl(): string {
  return optionalEnv("APP_URL", "http://localhost:3000").replace(/\/$/, "");
}

export const isProd = () => process.env.NODE_ENV === "production";
