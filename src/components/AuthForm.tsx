"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Logo } from "./Logo";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const safeNext = next && next.startsWith("/app") ? next : "/app";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const r = await api<{ emailSent: boolean }>("/api/auth/signup", { body: { email, password } });
        window.location.href = r.emailSent ? "/verify-email" : "/verify-email?status=send-failed";
      } else {
        const r = await api<{ emailVerified: boolean }>("/api/auth/login", { body: { email, password } });
        window.location.href = r.emailVerified ? safeNext : "/verify-email";
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-[20px] bg-white md:grid-cols-2">
      <div className="tao-gradient hidden flex-col justify-between p-8 text-white md:flex">
        <p className="text-3xl font-extrabold leading-tight">Write it once in Chinese. Sell it in English.</p>
        <ul className="space-y-2 text-sm text-white/90">
          <li>Listings written for American shoppers</li>
          <li>Checked against Amazon and US ad rules</li>
          <li>Every finding links to its source</li>
        </ul>
      </div>
      <form onSubmit={submit} className="space-y-4 p-8">
        <Logo />
        <h1 className="text-2xl font-extrabold">{mode === "signup" ? "Create your account" : "Log in"}</h1>
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="field"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={mode === "signup" ? 8 : undefined}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "signup" && <p className="field-hint">At least 8 characters</p>}
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">{error}</p>}
        <button className="btn-tao w-full py-3 text-base" disabled={busy}>
          {busy ? "One moment…" : mode === "signup" ? "Sign up and verify email" : "Log in"}
        </button>
        <p className="text-center text-sm text-muted">
          {mode === "signup" ? (
            <>Already have an account? <Link className="font-semibold text-tao" href="/login">Log in</Link></>
          ) : (
            <>New to ListLocal? <Link className="font-semibold text-tao" href="/signup">Sign up free</Link></>
          )}
        </p>
      </form>
    </div>
  );
}
