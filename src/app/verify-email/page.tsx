import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { ResendButton } from "@/components/ResendButton";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const user = await currentUser();
  if (user?.emailVerified) redirect("/app");

  return (
    <div className="card mx-auto max-w-md space-y-4">
      {status === "invalid" ? (
        <>
          <h1 className="text-xl font-semibold">链接无效或已过期</h1>
          <p className="text-sm text-muted">验证链接只能用一次，24 小时内有效。登录后可以重新发送。</p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">请查收验证邮件</h1>
          <p className="text-sm text-muted">
            我们给 <span className="font-medium text-ink">{user?.email ?? "你的邮箱"}</span> 发了一封验证邮件，点里面的链接就能开始使用。没收到的话看看垃圾邮件箱。
          </p>
        </>
      )}
      {user ? <ResendButton /> : <Link className="btn" href="/login">登录</Link>}
    </div>
  );
}
