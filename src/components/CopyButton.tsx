"use client";

import { useState } from "react";

export function CopyButton({ text, label = "复制" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost px-2 py-1 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked: user can still select the text */
        }
      }}
    >
      {done ? "已复制" : label}
    </button>
  );
}
