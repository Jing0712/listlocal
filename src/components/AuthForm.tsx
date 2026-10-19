"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        await api("/api/auth/signup", { body: { email, password } });
        window.location.href = "/verify-email";
      } else {
        const r = await api<{ emailVerified: boolean }>("/api/auth/login", { body: { email, password } });
        const safeNext = next && next.startsWith("/app") ? next : "/app";
        window.location.href = r.emailVerified ? safeNext : "/verify-email";
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">{mode === "signup" ? "注册 ListLocal" : "登录"}</h1>
      <div>
        <label className="label" htmlFor="email">邮箱</label>
        <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">密码</label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={mode === "signup" ? 8 : undefined}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "signup" && <p className="hint mt-1">至少 8 位</p>}
      </div>
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-bad">{error}</p>}
      <button className="btn w-full" disabled={busy}>
        {busy ? "请稍候…" : mode === "signup" ? "注册并发送验证邮件" : "登录"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "signup" ? (
          <>已经有账号？<Link className="underline" href="/login">登录</Link></>
        ) : (
          <>还没有账号？<Link className="underline" href="/signup">免费注册</Link></>
        )}
      </p>
    </form>
  );
}
