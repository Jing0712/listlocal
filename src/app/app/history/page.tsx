import Link from "next/link";
import { currentUser } from "@/lib/auth/session";
import { collections } from "@/lib/db";

export default async function HistoryPage() {
  const user = (await currentUser())!;
  const { listings, checks } = await collections();
  const [rows, checkCount] = await Promise.all([
    listings.find({ userId: user._id }, { projection: { productName: 1, createdAt: 1, status: 1, "result.finalIssues": 1, "result.final.title": 1, "result.repaired": 1 } }).sort({ createdAt: -1 }).limit(100).toArray(),
    checks.countDocuments({ userId: user._id }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">历史记录</h1>
        <p className="text-sm text-muted">共生成 {rows.length} 次 · 检查过 {checkCount} 个已有 listing</p>
      </div>
      {rows.length === 0 ? (
        <div className="card text-sm text-muted">
          还没有记录。<Link href="/app" className="underline">生成第一个 listing</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const errs = r.result?.finalIssues.filter((i) => i.severity === "error").length ?? 0;
            const warns = r.result?.finalIssues.filter((i) => i.severity === "warning").length ?? 0;
            return (
              <li key={r._id.toHexString()}>
                <Link href={`/app/listings/${r._id.toHexString()}`} className="card flex items-center justify-between gap-4 hover:border-ink">
                  <div className="min-w-0">
                    <p className="font-medium">{r.productName}</p>
                    <p className="truncate text-sm text-muted">{r.result?.final.title ?? (r.status === "failed" ? "生成失败" : "处理中")}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    {r.status === "done" ? (
                      <p className={errs ? "text-bad" : "text-ok"}>{errs ? `${errs} 个必须修改` : "通过"}{warns ? ` · ${warns} 个建议` : ""}</p>
                    ) : (
                      <p className="text-bad">{r.status === "failed" ? "失败" : "未完成"}</p>
                    )}
                    <p className="text-muted">{r.createdAt.toLocaleDateString("zh-CN", { timeZone: "America/Los_Angeles" })}</p>
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
