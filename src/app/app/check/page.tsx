"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { IssueCounts, IssueList } from "@/components/IssueList";
import type { Issue } from "@/lib/compliance/types";

export default function CheckPage() {
  const [f, setF] = useState({ title: "", bullets: "", description: "", searchTerms: "", ownBrand: "", avoidBrands: "" });
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ issues: Issue[] }>("/api/check", {
        body: {
          title: f.title,
          bullets: f.bullets.split("\n").map((s) => s.replace(/^[-•*]\s*/, "").trim()).filter(Boolean),
          description: f.description,
          searchTerms: f.searchTerms,
          ownBrand: f.ownBrand,
          avoidBrands: f.avoidBrands.split(/[,，、]/).map((s) => s.trim()).filter(Boolean),
        },
      });
      setIssues(r.issues);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Check a listing</h1>
        <p className="text-sm text-muted">Paste an English listing you already have. Only the rule engine runs, no AI, so it is free and unlimited.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={submit} className="panel space-y-4">
          <div>
            <label className="field-label" htmlFor="c-title">Title</label>
            <input id="c-title" className="field" value={f.title} onChange={set("title")} />
          </div>
          <div>
            <label className="field-label" htmlFor="c-bullets">Bullet points</label>
            <textarea id="c-bullets" className="field min-h-32" value={f.bullets} onChange={set("bullets")} placeholder="One per line" />
          </div>
          <div>
            <label className="field-label" htmlFor="c-desc">Description</label>
            <textarea id="c-desc" className="field min-h-24" value={f.description} onChange={set("description")} />
          </div>
          <div>
            <label className="field-label" htmlFor="c-terms">Backend search terms</label>
            <textarea id="c-terms" className="field min-h-16" value={f.searchTerms} onChange={set("searchTerms")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="c-brand">Your brand name</label>
              <input id="c-brand" className="field" value={f.ownBrand} onChange={set("ownBrand")} />
            </div>
            <div>
              <label className="field-label" htmlFor="c-avoid">Brands to keep out</label>
              <input id="c-avoid" className="field" value={f.avoidBrands} onChange={set("avoidBrands")} placeholder="Separated by commas" />
            </div>
          </div>
          <button className="btn-tao w-full py-3" disabled={busy}>{busy ? "Checking…" : "Check listing"}</button>
          {error && <p className="text-sm font-semibold text-bad">{error}</p>}
        </form>
        <section className="panel space-y-4 lg:self-start">
          <h2 className="text-lg font-extrabold">Compliance report</h2>
          {issues ? (
            <>
              <IssueCounts issues={issues} />
              <IssueList issues={issues} />
            </>
          ) : (
            <p className="rounded-xl bg-page px-4 py-10 text-center text-sm text-muted">Paste a listing and run the check. Results show up here.</p>
          )}
        </section>
      </div>
    </div>
  );
}
