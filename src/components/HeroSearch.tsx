"use client";

import { useState } from "react";

const HOT = ["硅胶折叠水杯", "记忆棉颈椎枕", "宠物除毛滚筒", "挂脖风扇", "竹制砧板三件套"];

/** Taobao's signature element: a chunky orange-framed search bar with "hot searches" under it. */
export function HeroSearch({ loggedIn }: { loggedIn: boolean }) {
  const [q, setQ] = useState("");

  function go(name: string) {
    const target = `/app?name=${encodeURIComponent(name.trim())}`;
    window.location.href = loggedIn ? target : `/signup?next=${encodeURIComponent(target)}`;
  }

  return (
    <div className="w-full max-w-3xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) go(q);
        }}
        className="flex h-14 items-center rounded-full border-[3px] border-tao bg-white pl-5 pr-1 shadow-[0_6px_24px_rgba(255,80,0,0.18)]"
      >
        <label htmlFor="hero-q" className="sr-only">Product name</label>
        <input
          id="hero-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type your product name in Chinese or English"
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          maxLength={200}
        />
        <button className="btn-tao h-11 shrink-0 px-7 text-base">Localize</button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2 pl-5 text-sm text-white/90">
        <span>Try:</span>
        {HOT.map((h) => (
          <button key={h} type="button" onClick={() => setQ(h)} className="rounded-full bg-white/15 px-3 py-0.5 hover:bg-white/25">
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}
