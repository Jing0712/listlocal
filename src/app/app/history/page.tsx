import Link from "next/link";
import { currentUser } from "@/lib/auth/session";
import { collections } from "@/lib/db";

const TINTS = ["from-[#ffe7d6] to-[#ffd0b0]", "from-[#e5f0ff] to-[#cfe0ff]", "from-[#e8f7ee] to-[#cdeedb]", "from-[#f3e8ff] to-[#e4d0ff]", "from-[#fff6d6] to-[#ffe9a8]"];

export default async function HistoryPage() {
  const user = (await currentUser())!;
  const { listings, checks } = await collections();
  const [rows, checkCount] = await Promise.all([
    listings
      .find({ userId: user._id }, { projection: { productName: 1, createdAt: 1, status: 1, "result.finalIssues": 1, "result.final.title": 1, "result.repaired": 1 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray(),
    checks.countDocuments({ userId: user._id }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">History</h1>
          <p className="text-sm text-muted">
            {rows.length} {rows.length === 1 ? "listing" : "listings"} created, {checkCount} existing {checkCount === 1 ? "listing" : "listings"} checked
          </p>
        </div>
        <Link href="/app" className="btn-tao">Create a listing</Link>
      </div>

      {rows.length === 0 ? (
        <div className="panel py-12 text-center">
          <p className="text-lg font-bold">No listings yet</p>
          <p className="mb-4 text-sm text-muted">Your first three are free.</p>
          <Link href="/app" className="btn-tao">Create your first listing</Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r, i) => {
            const errs = r.result?.finalIssues.filter((x) => x.severity === "error").length ?? 0;
            const warns = r.result?.finalIssues.filter((x) => x.severity === "warning").length ?? 0;
            return (
              <li key={r._id.toHexString()}>
                <Link
                  href={`/app/listings/${r._id.toHexString()}`}
                  className="block h-full overflow-hidden rounded-[14px] bg-white ring-tao transition-shadow hover:ring-2"
                >
                  <div className={`bg-gradient-to-br ${TINTS[i % TINTS.length]} px-4 py-6`}>
                    <p className="line-clamp-2 text-xl font-extrabold">{r.productName}</p>
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="line-clamp-2 min-h-10 text-sm leading-snug">
                      {r.result?.final.title ?? (r.status === "failed" ? "Generation failed" : "Did not finish")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {r.status !== "done" ? (
                        <span className="tag tag-bad">{r.status === "failed" ? "Failed, not charged" : "Unfinished"}</span>
                      ) : errs ? (
                        <span className="tag tag-bad">{errs} must fix</span>
                      ) : (
                        <span className="tag tag-ok">Passed checks</span>
                      )}
                      {warns > 0 && <span className="tag">{warns} to review</span>}
                      {r.result?.repaired && <span className="tag">Auto-fixed</span>}
                    </div>
                    <p className="text-xs text-muted">{r.createdAt.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
