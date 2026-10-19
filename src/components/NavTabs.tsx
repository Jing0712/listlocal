"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", label: "Create listing", exact: true },
  { href: "/app/check", label: "Check a listing" },
  { href: "/app/history", label: "History" },
  { href: "/app/account", label: "Plan" },
];

export function NavTabs() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto text-[15px]">
      {TABS.map((t) => {
        const active = t.exact ? path === t.href : path.startsWith(t.href);
        // listing detail pages belong to History
        const activeHistory = t.href === "/app/history" && path.startsWith("/app/listings");
        const on = active || activeHistory;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-2 font-semibold transition-colors ${
              on ? "bg-tao-soft text-tao" : "text-ink hover:text-tao"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
