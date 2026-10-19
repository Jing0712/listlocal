import type { Metadata } from "next";
import Link from "next/link";
import { Figtree } from "next/font/google";
import "./globals.css";
import { currentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/LogoutButton";
import { NavTabs } from "@/components/NavTabs";
import { Logo } from "@/components/Logo";

const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-figtree" });

// The header depends on the session cookie, so no page can be prerendered as "logged out".
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ListLocal: Amazon listings for cross-border sellers",
  description: "Turn Chinese product info into a US Amazon listing that passes compliance checks.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // If the DB is unreachable the header still renders (logged-out view) rather than crashing every page.
  const user = await currentUser().catch(() => null);
  return (
    <html lang="en" className={figtree.variable}>
      <body className="min-h-screen font-sans antialiased">
        {/* Thin utility bar, as on Taobao */}
        <div className="border-b border-line bg-[#f5f5f5] text-xs text-muted">
          <div className="mx-auto flex h-8 max-w-6xl items-center justify-between px-4">
            <span>Built for Chinese sellers on Amazon US</span>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="hidden sm:inline">{user.email}</span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:text-tao">Log in</Link>
                  <Link href="/signup" className="text-tao hover:underline">Sign up free</Link>
                </>
              )}
            </div>
          </div>
        </div>

        <header className="bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
            <Link href={user ? "/app" : "/"} aria-label="ListLocal home">
              <Logo />
            </Link>
            {user ? <NavTabs /> : (
              <Link href="/signup" className="btn-tao text-sm">Start free</Link>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

        <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs leading-relaxed text-muted">
          ListLocal is a student capstone project. Compliance checks are compiled from public sources and are not legal advice.
          Confirm against the current Amazon Seller Central policies before you publish.
        </footer>
      </body>
    </html>
  );
}
