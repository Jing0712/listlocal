import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { currentUser } from "@/lib/auth/session";
import { collections } from "@/lib/db";
import { utf8Bytes } from "@/lib/compliance/check";
import { CopyButton } from "@/components/CopyButton";
import { IssueCounts, IssueList } from "@/components/IssueList";
import type { Listing } from "@/lib/compliance/types";

const STEP_NAMES: Record<string, string> = { generate: "AI writes listing", check: "Rule check", repair: "AI fixes problems", recheck: "Rule check again" };

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await currentUser())!;
  if (!ObjectId.isValid(id)) notFound();
  const { listings } = await collections();
  const doc = await listings.findOne({ _id: new ObjectId(id), userId: user._id });
  if (!doc) notFound();

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <Link href="/app/history" className="text-sm text-muted hover:text-tao">Back to history</Link>
        <h1 className="text-2xl font-extrabold">{doc.productName}</h1>
        <p className="text-sm text-muted">{doc.createdAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" })}</p>
      </div>
      <Link href="/app" className="btn-tao">Create another</Link>
    </div>
  );

  if (doc.status !== "done" || !doc.result) {
    return (
      <div className="space-y-4">
        {header}
        <div className="panel space-y-3">
          <p className="text-lg font-bold text-bad">
            {doc.status === "running" ? "This run did not finish" : "This run failed and was not counted against your quota"}
          </p>
          {doc.error && <p className="text-sm text-muted">Error: {doc.error}</p>}
          <Steps steps={doc.steps} />
        </div>
      </div>
    );
  }

  // Records created before the English switch used *Zh field names.
  const r = doc.result as typeof doc.result & { notesZh?: string[]; missingInfoZh?: string[] };
  const notes = r.notes ?? r.notesZh ?? [];
  const missing = r.missingInfo ?? r.missingInfoZh ?? [];
  const flags = (r.aiRiskFlags ?? []).map((f) => ({ ...f, reason: f.reason ?? (f as { reasonZh?: string }).reasonZh ?? "" }));
  const draftErrors = r.draftIssues.filter((i) => i.severity === "error").length;
  const finalErrors = r.finalIssues.filter((i) => i.severity === "error").length;

  return (
    <div className="space-y-4">
      {header}

      <div className={`rounded-[14px] px-5 py-4 ${finalErrors ? "bg-red-50" : "bg-green-50"}`}>
        {finalErrors === 0 ? (
          <p className="font-semibold text-ok">
            Passed every must-fix rule.
            {r.repaired && draftErrors > 0 && ` The first draft had ${draftErrors} must-fix ${draftErrors === 1 ? "problem" : "problems"}; they were fixed automatically.`}
          </p>
        ) : (
          <p className="font-semibold text-bad">
            {finalErrors} must-fix {finalErrors === 1 ? "problem remains" : "problems remain"} after the automatic fix. See the report on the right before you publish.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="panel space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Your US listing</h2>
            <CopyButton text={listingText(r.final)} label="Copy all" />
          </div>
          <Block label="Title" meter={`${[...r.final.title].length}/200 characters`} text={r.final.title} strong />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold">Bullet points</span>
              <CopyButton text={r.final.bullets.join("\n")} />
            </div>
            <ul className="space-y-2">
              {r.final.bullets.map((b, i) => (
                <li key={i} className="flex gap-3 rounded-xl bg-page p-3 text-sm leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-tao" aria-hidden />
                  <span className="flex-1">{b}</span>
                  <span className="shrink-0 text-xs text-muted">{[...b].length}</span>
                </li>
              ))}
            </ul>
          </div>
          <Block label="Description" meter={`${[...r.final.description].length} characters`} text={r.final.description} multiline />
          <Block label="Backend search terms" meter={`${utf8Bytes(r.final.searchTerms)}/250 bytes`} text={r.final.searchTerms} />
        </section>

        <aside className="space-y-4">
          <section className="panel space-y-4">
            <h2 className="text-lg font-extrabold">Compliance report</h2>
            <IssueCounts issues={r.finalIssues} />
            <IssueList issues={r.finalIssues} empty="No problems found in the final listing" />
          </section>

          {flags.length > 0 && (
            <section className="panel space-y-3">
              <h2 className="text-lg font-extrabold">Claims the AI left out</h2>
              <p className="text-xs text-muted">The AI judged these risky. This is not a rule result, so review them yourself.</p>
              <ul className="space-y-3 text-sm">
                {flags.map((f, i) => (
                  <li key={i}>
                    <span className="tag">{f.text}</span>
                    <p className="mt-1 text-muted">{f.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {missing.length > 0 && (
            <section className="panel space-y-2">
              <h2 className="text-lg font-extrabold">Add these if you can</h2>
              <p className="text-xs text-muted">US shoppers usually look for this. You didn&apos;t provide it, so the AI did not make it up.</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {missing.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </section>
          )}

          {notes.length > 0 && (
            <section className="panel space-y-2">
              <h2 className="text-lg font-extrabold">Localization notes</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {notes.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {r.repaired && (
        <details className="panel">
          <summary className="cursor-pointer font-bold">See the first draft and what the check found</summary>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <pre className="whitespace-pre-wrap rounded-xl bg-page p-4 font-sans text-xs leading-relaxed">{listingText(r.draft)}</pre>
            <IssueList issues={r.draftIssues} />
          </div>
        </details>
      )}

      <details className="panel">
        <summary className="cursor-pointer font-bold">Run log</summary>
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className="tag">{r.model}</span>
            <span className="tag">{r.tokens.in.toLocaleString()} tokens in</span>
            <span className="tag">{r.tokens.out.toLocaleString()} tokens out</span>
            <span className="tag">${r.costUsd.toFixed(4)}</span>
            <span className="tag">{((doc.latencyMs ?? 0) / 1000).toFixed(1)} s</span>
          </div>
          <Steps steps={doc.steps} />
        </div>
      </details>
    </div>
  );
}

function Block({ label, meter, text, multiline, strong }: { label: string; meter: string; text: string; multiline?: boolean; strong?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">
          {label} <span className="ml-1 text-xs font-normal text-muted">{meter}</span>
        </span>
        <CopyButton text={text} />
      </div>
      <p className={`rounded-xl bg-page p-3 leading-relaxed ${strong ? "text-base font-semibold" : "text-sm"} ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {text || "(empty)"}
      </p>
    </div>
  );
}

function Steps({ steps }: { steps: { name: string; ms: number; ok: boolean; detail?: string }[] }) {
  if (!steps?.length) return null;
  return (
    <ol className="space-y-1">
      {steps.map((s, i) => (
        <li key={i} className={s.ok ? "" : "text-bad"}>
          <span className="font-semibold">{i + 1}. {STEP_NAMES[s.name] ?? s.name}</span>
          <span className="text-muted">, {(s.ms / 1000).toFixed(1)} s, {s.ok ? "ok" : "failed"}</span>
          {s.detail && <span className="text-muted"> ({s.detail})</span>}
        </li>
      ))}
    </ol>
  );
}

function listingText(l: Listing) {
  return `TITLE\n${l.title}\n\nBULLET POINTS\n${l.bullets.map((b) => `- ${b}`).join("\n")}\n\nDESCRIPTION\n${l.description}\n\nSEARCH TERMS\n${l.searchTerms}`;
}
