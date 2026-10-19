import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { ResendButton } from "@/components/ResendButton";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const user = await currentUser();
  if (user?.emailVerified) redirect("/app");

  return (
    <div className="panel mx-auto max-w-md space-y-4 p-8 text-center">
      <div className="tao-gradient mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white" aria-hidden>
        ✉
      </div>
      {status === "invalid" ? (
        <>
          <h1 className="text-2xl font-extrabold">This link has expired or was already used</h1>
          <p className="text-sm text-muted">Verification links work once and expire after 24 hours. Log in to get a new one.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold">Check your inbox</h1>
          <p className="text-sm text-muted">
            We sent a verification link to <span className="font-semibold text-ink">{user?.email ?? "your email"}</span>. Open it to start
            creating listings. Can&apos;t find it? Check your spam folder.
          </p>
        </>
      )}
      {user ? <ResendButton /> : <Link className="btn-tao" href="/login">Log in</Link>}
    </div>
  );
}
