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
      <div className="flex flex-wrap gap-2">
        {!isPro && (
          <button className="btn-tao" disabled={busy} onClick={() => go("/api/billing/checkout")}>
            {busy ? "Opening Stripe…" : "Upgrade to Pro"}
          </button>
        )}
        {hasCustomer && (
          <button className="btn-line" disabled={busy} onClick={() => go("/api/billing/portal")}>
            Open billing page
          </button>
        )}
      </div>
      {error && <p className="text-sm font-semibold text-bad">{error}</p>}
    </div>
  );
}
