import { currentUser } from "@/lib/auth/session";
import { quotaOf } from "@/lib/quota";
import { BillingButtons } from "@/components/BillingButtons";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const user = (await currentUser())!;
  const q = quotaOf(user);
  const isPro = q.plan === "pro";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold">Plan and billing</h1>

      {checkout === "success" && !isPro && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-warn">
          Payment received. Waiting for Stripe to confirm, which usually takes a few seconds. Refresh this page in a moment.
        </p>
      )}
      {checkout === "success" && isPro && <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-ok">You are on Pro. Enjoy unlimited listings.</p>}
      {checkout === "cancelled" && <p className="rounded-xl bg-white px-4 py-3 text-sm text-muted">Checkout cancelled. You were not charged.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="panel space-y-3">
          <p className="text-sm text-muted">Current plan</p>
          <p className="text-3xl font-extrabold text-tao">{isPro ? "Pro" : "Free"}</p>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Email</dt><dd>{user.email}</dd></div>
            <div className="flex justify-between">
              <dt className="text-muted">Listings created</dt>
              <dd>{q.used}{q.limit !== null && ` of ${q.limit} free`}</dd>
            </div>
            {user.subscriptionStatus && (
              <div className="flex justify-between"><dt className="text-muted">Subscription</dt><dd>{user.subscriptionStatus}</dd></div>
            )}
          </dl>
        </section>

        <section className={`panel space-y-3 ${isPro ? "" : "ring-2 ring-tao"}`}>
          {isPro ? (
            <>
              <p className="text-lg font-extrabold">Manage your subscription</p>
              <p className="text-sm text-muted">See invoices, change your card or cancel on Stripe&apos;s billing page.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-extrabold">Upgrade to Pro</p>
              <p className="text-tao">
                <span className="text-lg font-bold">$</span>
                <span className="text-5xl font-extrabold">19</span>
                <span className="font-semibold text-muted"> / month</span>
              </p>
              <p className="text-sm text-muted">Unlimited listings. Payment is handled by Stripe; we never see your card.</p>
            </>
          )}
          <BillingButtons isPro={isPro} hasCustomer={Boolean(user.stripeCustomerId)} />
          <p className="field-hint">Test mode: use card 4242 4242 4242 4242, any future date and any CVC.</p>
        </section>
      </div>
    </div>
  );
}
