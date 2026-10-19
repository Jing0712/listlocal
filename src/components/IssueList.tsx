import type { Issue } from "@/lib/compliance/types";

const STYLE = {
  error: { dot: "bg-bad", label: "必须修改", text: "text-bad" },
  warning: { dot: "bg-warn", label: "建议修改", text: "text-warn" },
  info: { dot: "bg-stone-400", label: "优化建议", text: "text-muted" },
} as const;

export function fieldLabel(field: string) {
  const m = field.match(/^bullets\[(\d+)\]$/);
  if (m) return `五点描述 第 ${Number(m[1]) + 1} 条`;
  return { title: "标题", bullets: "五点描述", description: "产品描述", searchTerms: "后台搜索词" }[field] ?? field;
}

export function IssueList({ issues, empty = "没有发现问题" }: { issues: Issue[]; empty?: string }) {
  if (issues.length === 0) return <p className="text-sm text-ok">✓ {empty}</p>;
  const order = { error: 0, warning: 1, info: 2 };
  const sorted = [...issues].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <ul className="space-y-3">
      {sorted.map((i, n) => {
        const s = STYLE[i.severity];
        return (
          <li key={n} className="flex gap-3 text-sm">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
            <div className="space-y-1">
              <p>
                <span className={`font-medium ${s.text}`}>{s.label}</span>
                <span className="text-muted"> · {fieldLabel(i.field)} · </span>
                <code className="rounded bg-stone-100 px-1">{i.match}</code>
              </p>
              <p>{i.messageZh}</p>
              <p className="text-muted">怎么改：{i.fixZh}</p>
              {i.source && (
                <p className="text-xs text-muted">
                  依据：
                  <a className="underline" href={i.source.url} target="_blank" rel="noreferrer">
                    {i.source.title}
                  </a>
                  {i.source.kind === "secondary" && "（公开整理资料，以 Seller Central 原文为准）"}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function IssueSummary({ issues }: { issues: Issue[] }) {
  const c = (s: Issue["severity"]) => issues.filter((i) => i.severity === s).length;
  return (
    <span className="text-sm">
      <span className="text-bad">{c("error")} 必须修改</span> · <span className="text-warn">{c("warning")} 建议修改</span> ·{" "}
      <span className="text-muted">{c("info")} 优化建议</span>
    </span>
  );
}
