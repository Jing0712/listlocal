"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";

export function ResendButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <button
        className="btn-ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/api/auth/resend", { method: "POST" });
            setMsg("已重新发送，请查收。");
          } catch (e) {
            setMsg((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        重新发送验证邮件
      </button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
