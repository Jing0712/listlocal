import { currentUser } from "@/lib/auth/session";
import { quotaOf } from "@/lib/quota";
import { BillingButtons } from "@/components/BillingButtons";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const user = (await currentUser())!;
  const q = quotaOf(user);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">账户</h1>
      {checkout === "success" && user.plan !== "pro" && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-warn">
          付款成功，正在等待 Stripe 确认（通常几秒钟）。请稍后刷新页面。
        </p>
      )}
      {checkout === "success" && user.plan === "pro" && <p className="rounded-lg bg-green-50 p-3 text-sm text-ok">升级成功，欢迎使用 Pro！</p>}
      {checkout === "cancelled" && <p className="rounded-lg bg-stone-100 p-3 text-sm text-muted">已取消付款，没有扣费。</p>}

      <div className="card space-y-2 text-sm">
        <p><span className="text-muted">邮箱：</span>{user.email}</p>
        <p><span className="text-muted">套餐：</span>{q.plan === "pro" ? "Pro（无限生成）" : "免费版"}</p>
        <p>
          <span className="text-muted">已生成：</span>
          {q.used} 个{q.limit !== null && `（免费额度 ${q.limit} 个，剩余 ${q.remaining} 个）`}
        </p>
        {user.subscriptionStatus && <p><span className="text-muted">订阅状态：</span>{user.subscriptionStatus}</p>}
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">{q.plan === "pro" ? "管理订阅" : "升级 Pro · $19/月"}</h2>
        <p className="text-sm text-muted">
          {q.plan === "pro" ? "可以在 Stripe 页面查看账单或取消订阅。" : "无限生成 listing。付款在 Stripe 完成，本站不保存任何银行卡信息。"}
        </p>
        <BillingButtons isPro={q.plan === "pro"} hasCustomer={Boolean(user.stripeCustomerId)} />
        <p className="hint">测试模式：可以用卡号 4242 4242 4242 4242、任意未来日期和任意 CVC。</p>
      </div>
    </div>
  );
}
