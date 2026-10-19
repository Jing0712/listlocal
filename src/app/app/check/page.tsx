"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { IssueList, IssueSummary } from "@/components/IssueList";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">检查已有 listing</h1>
        <p className="text-sm text-muted">把已经上架或准备上架的英文 listing 贴进来，用规则引擎检查。不调用 AI，免费、不占额度。</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="label">标题</label>
            <input className="input" value={f.title} onChange={set("title")} />
          </div>
          <div>
            <label className="label">五点描述</label>
            <textarea className="input min-h-32" value={f.bullets} onChange={set("bullets")} placeholder="每行一条" />
          </div>
          <div>
            <label className="label">产品描述</label>
            <textarea className="input min-h-24" value={f.description} onChange={set("description")} />
          </div>
          <div>
            <label className="label">后台搜索词</label>
            <textarea className="input min-h-16" value={f.searchTerms} onChange={set("searchTerms")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">你的品牌名</label>
              <input className="input" value={f.ownBrand} onChange={set("ownBrand")} />
            </div>
            <div>
              <label className="label">不能出现的品牌</label>
              <input className="input" value={f.avoidBrands} onChange={set("avoidBrands")} placeholder="逗号分隔" />
            </div>
          </div>
          <button className="btn w-full" disabled={busy}>{busy ? "检查中…" : "开始检查"}</button>
          {error && <p className="text-sm text-bad">{error}</p>}
        </form>
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">结果</h2>
            {issues && <IssueSummary issues={issues} />}
          </div>
          {issues ? <IssueList issues={issues} /> : <p className="text-sm text-muted">检查结果会显示在这里。</p>}
        </div>
      </div>
    </div>
  );
}
