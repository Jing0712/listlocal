import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { currentUser } from "@/lib/auth/session";
import { collections } from "@/lib/db";
import { utf8Bytes } from "@/lib/compliance/check";
import { CopyButton } from "@/components/CopyButton";
import { IssueList, IssueSummary } from "@/components/IssueList";
import type { Listing } from "@/lib/compliance/types";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await currentUser())!;
  if (!ObjectId.isValid(id)) notFound();
  const { listings } = await collections();
  const doc = await listings.findOne({ _id: new ObjectId(id), userId: user._id });
  if (!doc) notFound();

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <Link href="/app/history" className="text-sm text-muted">← 历史记录</Link>
        <h1 className="text-2xl font-semibold">{doc.productName}</h1>
        <p className="text-sm text-muted">{doc.createdAt.toLocaleString("zh-CN", { timeZone: "America/Los_Angeles" })}</p>
      </div>
      <Link href="/app" className="btn">再生成一个</Link>
    </div>
  );

  if (doc.status !== "done" || !doc.result) {
    return (
      <div className="space-y-6">
        {header}
        <div className="card space-y-2">
          <p className="font-medium text-bad">{doc.status === "running" ? "还在生成中（或上次请求中断了）" : "这次生成失败了，没有扣除额度"}</p>
          {doc.error && <p className="text-sm text-muted">错误信息：{doc.error}</p>}
          <Steps steps={doc.steps} />
        </div>
      </div>
    );
  }

  const r = doc.result;
  const all = listingText(r.final);
  const draftErrors = r.draftIssues.filter((i) => i.severity === "error").length;
  const finalErrors = r.finalIssues.filter((i) => i.severity === "error").length;

  return (
    <div className="space-y-6">
      {header}

      <div className={`rounded-xl p-4 text-sm ${finalErrors ? "bg-red-50" : "bg-green-50"}`}>
        {finalErrors === 0 ? (
          <p className="text-ok">
            ✓ 最终版本通过了全部「必须修改」规则。
            {r.repaired && ` 初稿有 ${draftErrors} 个必须修改的问题，已自动修正。`}
          </p>
        ) : (
          <p className="text-bad">还有 {finalErrors} 个必须修改的问题，自动修正没能全部解决，请看下面的说明手动处理。</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">美国站 listing</h2>
            <CopyButton text={all} label="复制全部" />
          </div>
          <Block label="标题" meta={`${[...r.final.title].length} / 200 字符`} text={r.final.title} />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="label mb-0">五点描述</span>
              <CopyButton text={r.final.bullets.join("\n")} />
            </div>
            <ul className="space-y-2">
              {r.final.bullets.map((b, i) => (
                <li key={i} className="rounded-lg bg-stone-50 p-3 text-sm">
                  {b}
                  <span className="ml-2 text-xs text-muted">{[...b].length} 字符</span>
                </li>
              ))}
            </ul>
          </div>
          <Block label="产品描述" meta={`${[...r.final.description].length} 字符`} text={r.final.description} multiline />
          <Block label="后台搜索词" meta={`${utf8Bytes(r.final.searchTerms)} / 250 字节`} text={r.final.searchTerms} />
        </section>

        <aside className="space-y-6">
          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">规则检查</h2>
              <IssueSummary issues={r.finalIssues} />
            </div>
            <IssueList issues={r.finalIssues} empty="最终版本没有发现问题" />
          </section>

          {r.aiRiskFlags.length > 0 && (
            <section className="card space-y-3">
              <h2 className="font-semibold">AI 从你的描述里删掉的风险说法</h2>
              <p className="hint">这些是 AI 判断的，不是规则引擎的结论，请自己复核。</p>
              <ul className="space-y-2 text-sm">
                {r.aiRiskFlags.map((f, i) => (
                  <li key={i}>
                    <code className="rounded bg-stone-100 px-1">{f.text}</code>
                    <p className="text-muted">{f.reasonZh}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r.missingInfoZh.length > 0 && (
            <section className="card space-y-2">
              <h2 className="font-semibold">建议补充的信息</h2>
              <p className="hint">美国买家通常想知道这些，但你没提供，AI 没有编造。</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {r.missingInfoZh.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </section>
          )}

          {r.notesZh.length > 0 && (
            <section className="card space-y-2">
              <h2 className="font-semibold">本地化说明</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {r.notesZh.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {r.repaired && (
        <details className="card">
          <summary className="cursor-pointer font-semibold">查看 AI 初稿和它的问题（修正前）</summary>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <pre className="whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-xs">{listingText(r.draft)}</pre>
            <IssueList issues={r.draftIssues} />
          </div>
        </details>
      )}

      <details className="card">
        <summary className="cursor-pointer font-semibold">运行记录</summary>
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-muted">
            模型 {r.model} · 输入 {r.tokens.in} / 输出 {r.tokens.out} tokens · 成本 ${r.costUsd.toFixed(4)} · 用时 {((doc.latencyMs ?? 0) / 1000).toFixed(1)} 秒
          </p>
          <Steps steps={doc.steps} />
        </div>
      </details>
    </div>
  );
}

function Block({ label, meta, text, multiline }: { label: string; meta: string; text: string; multiline?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label mb-0">
          {label} <span className="ml-1 text-xs font-normal text-muted">{meta}</span>
        </span>
        <CopyButton text={text} />
      </div>
      <p className={`rounded-lg bg-stone-50 p-3 text-sm ${multiline ? "whitespace-pre-wrap" : ""}`}>{text || "（空）"}</p>
    </div>
  );
}

function Steps({ steps }: { steps: { name: string; ms: number; ok: boolean; detail?: string }[] }) {
  if (!steps?.length) return null;
  const names: Record<string, string> = { generate: "AI 生成", check: "规则检查", repair: "AI 修正", recheck: "再次检查" };
  return (
    <ol className="space-y-1 text-sm">
      {steps.map((s, i) => (
        <li key={i} className={s.ok ? "" : "text-bad"}>
          {i + 1}. {names[s.name] ?? s.name} · {(s.ms / 1000).toFixed(1)}s · {s.ok ? "成功" : "失败"}
          {s.detail && <span className="text-muted"> · {s.detail}</span>}
        </li>
      ))}
    </ol>
  );
}

function listingText(l: Listing) {
  return `TITLE\n${l.title}\n\nBULLET POINTS\n${l.bullets.map((b) => `- ${b}`).join("\n")}\n\nDESCRIPTION\n${l.description}\n\nSEARCH TERMS\n${l.searchTerms}`;
}
