import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/LogoutButton";

// The header depends on the session cookie, so no page can be prerendered as "logged out".
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ListLocal — 跨境卖家 Listing 本地化助手",
  description: "把中文产品信息变成符合美国买家习惯、通过 Amazon 合规检查的英文 listing。",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // If the DB is unreachable the header still renders (logged-out view) rather than crashing every page.
  const user = await currentUser().catch(() => null);
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <header className="border-b border-line bg-white/80 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              List<span className="text-accent">Local</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              {user ? (
                <>
                  <Link href="/app">生成</Link>
                  <Link href="/app/check">检查</Link>
                  <Link href="/app/history">历史</Link>
                  <Link href="/app/account">账户</Link>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login">登录</Link>
                  <Link href="/signup" className="btn">
                    免费试用
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted">
          ListLocal 是课程项目。合规检查基于公开资料整理，不构成法律意见；上架前请以 Amazon Seller Central 的最新政策为准。
        </footer>
      </body>
    </html>
  );
}
