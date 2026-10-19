"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";

export function ResendButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <button
        className="btn-line"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/api/auth/resend", { method: "POST" });
            setMsg("Sent. Check your inbox.");
          } catch (e) {
            setMsg((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Resend verification email
      </button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
