import type { Issue } from "@/lib/compliance/types";

const STYLE = {
  error: { dot: "bg-bad", label: "Must fix", text: "text-bad" },
  warning: { dot: "bg-warn", label: "Should fix", text: "text-warn" },
  info: { dot: "bg-[#bfbfbf]", label: "Tip", text: "text-muted" },
} as const;

export function fieldLabel(field: string) {
  const m = field.match(/^bullets\[(\d+)\]$/);
  if (m) return `Bullet ${Number(m[1]) + 1}`;
  return ({ title: "Title", bullets: "Bullets", description: "Description", searchTerms: "Search terms" } as Record<string, string>)[field] ?? field;
}

/** Old records stored Chinese text under messageZh/fixZh; show whichever exists. */
type AnyIssue = Issue & { messageZh?: string; fixZh?: string };

export function IssueList({ issues, empty = "No problems found" }: { issues: AnyIssue[]; empty?: string }) {
  if (issues.length === 0) return <p className="text-sm font-semibold text-ok">✓ {empty}</p>;
  const order = { error: 0, warning: 1, info: 2 };
  const sorted = [...issues].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <ul className="divide-y divide-line">
      {sorted.map((i, n) => {
        const s = STYLE[i.severity];
        return (
          <li key={n} className="flex gap-3 py-3 text-sm first:pt-0 last:pb-0">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`font-bold ${s.text}`}>{s.label}</span>
                <span className="text-muted">{fieldLabel(i.field)}</span>
                {i.match && <code className="max-w-full truncate rounded bg-page px-1.5 py-0.5 text-xs">{i.match}</code>}
              </p>
              <p>{i.message ?? i.messageZh}</p>
              <p className="text-muted">
                <span className="font-semibold text-ink">How to fix: </span>
                {i.fix ?? i.fixZh}
              </p>
              {i.source && (
                <p className="text-xs text-muted">
                  Source:{" "}
                  <a className="text-tao underline-offset-2 hover:underline" href={i.source.url} target="_blank" rel="noreferrer">
                    {i.source.title}
                  </a>
                  {i.source.kind === "secondary" && " (public summary; confirm in Seller Central)"}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function IssueCounts({ issues }: { issues: Issue[] }) {
  const c = (s: Issue["severity"]) => issues.filter((i) => i.severity === s).length;
  const cells = [
    { n: c("error"), label: "Must fix", cls: c("error") ? "text-bad" : "text-ok" },
    { n: c("warning"), label: "Should fix", cls: c("warning") ? "text-warn" : "text-ink" },
    { n: c("info"), label: "Tips", cls: "text-ink" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      {cells.map((x) => (
        <div key={x.label} className="rounded-xl bg-page py-3">
          <p className={`text-3xl font-extrabold ${x.cls}`}>{x.n}</p>
          <p className="text-xs text-muted">{x.label}</p>
        </div>
      ))}
    </div>
  );
}
