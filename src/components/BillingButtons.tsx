"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";

export function BillingButtons({ isPro, hasCustomer }: { isPro: boolean; hasCustomer: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(path: string) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>(path, { method: "POST" });
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {!isPro && (
          <button className="btn-accent" disabled={busy} onClick={() => go("/api/billing/checkout")}>
            {busy ? "跳转中…" : "升级 Pro"}
          </button>
        )}
        {hasCustomer && (
          <button className="btn-ghost" disabled={busy} onClick={() => go("/api/billing/portal")}>
            管理账单
          </button>
        )}
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
