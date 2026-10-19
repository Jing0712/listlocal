"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";

type Img = { mediaType: "image/jpeg"; data: string; preview: string };

const SAMPLE = {
  productName: "硅胶折叠水杯",
  category: "户外 / 露营用品",
  description:
    "食品级硅胶折叠杯，不用时可以压扁放进口袋，展开后可以装热水和冷水。带一个登山扣，可以挂在背包上。杯身抗菌，还能缓解口腔溃疡（客户反馈）。",
  specs: "容量 500ml；展开高度 11cm，折叠后 3cm；重量 85g；耐温 -40°C 到 200°C；颜色：蓝、绿、灰",
  targetCustomer: "露营、徒步、自驾游的人",
  ownBrand: "Trailmate",
  avoidBrands: "Stanley, YETI",
};

// Approximate, time-based hints (the request is a single call); the real step log is shown on the result page.
const STAGES = ["AI 正在撰写 listing…", "规则检查，必要时自动修正…", "还在处理，修正需要多一点时间…", "快好了…"];

export function GenerateForm({ outOfQuota }: { outOfQuota: boolean }) {
  const [f, setF] = useState({ productName: "", category: "", description: "", specs: "", targetCustomer: "", ownBrand: "", avoidBrands: "" });
  const [images, setImages] = useState<Img[]>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<{ msg: string; quota?: boolean; id?: string } | null>(null);

  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 9000);
    return () => clearInterval(t);
  }, [busy]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function addImages(files: FileList | null) {
    if (!files) return;
    const next = [...images];
    for (const file of Array.from(files).slice(0, 3 - images.length)) {
      try {
        next.push(await downscale(file));
      } catch {
        setError({ msg: `图片 ${file.name} 读取失败，请换一张 JPG/PNG` });
      }
    }
    setImages(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        ...f,
        avoidBrands: f.avoidBrands.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean),
        images: images.map(({ mediaType, data }) => ({ mediaType, data })),
      };
      const r = await api<{ id: string }>("/api/listings", { body });
      window.location.href = `/app/listings/${r.id}`;
    } catch (err) {
      const e2 = err as ApiError;
      setError({ msg: e2.message, quota: e2.status === 402, id: typeof e2.data?.id === "string" ? e2.data.id : undefined });
      setBusy(false);
    }
  }

  if (outOfQuota) {
    return (
      <div className="card space-y-3">
        <p className="font-medium">免费额度已经用完了</p>
        <p className="text-sm text-muted">升级 Pro 可以无限生成。检查已有 listing 的功能仍然免费。</p>
        <div className="flex gap-2">
          <Link href="/app/account" className="btn-accent">升级 Pro</Link>
          <Link href="/app/check" className="btn-ghost">检查已有 listing</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_280px]">
      <div className="card space-y-4">
        <div className="flex justify-end">
          <button type="button" className="text-xs text-accent underline" onClick={() => setF(SAMPLE)}>
            填入示例
          </button>
        </div>
        <Field label="产品名称 *" hint="中文即可">
          <input className="input" required maxLength={200} value={f.productName} onChange={set("productName")} />
        </Field>
        <Field label="类目">
          <input className="input" maxLength={100} value={f.category} onChange={set("category")} placeholder="例如：厨房用品 / 宠物玩具" />
        </Field>
        <Field label="产品描述和卖点 *" hint="材质、用途、和别家相比好在哪里">
          <textarea className="input min-h-32" required minLength={10} maxLength={4000} value={f.description} onChange={set("description")} />
        </Field>
        <Field label="参数" hint="尺寸、重量、容量、颜色、包装清单。AI 只会用这里写了的数字">
          <textarea className="input min-h-20" maxLength={2000} value={f.specs} onChange={set("specs")} />
        </Field>
        <Field label="目标买家">
          <input className="input" maxLength={500} value={f.targetCustomer} onChange={set("targetCustomer")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="你的品牌名">
            <input className="input" maxLength={60} value={f.ownBrand} onChange={set("ownBrand")} />
          </Field>
          <Field label="不能出现的品牌" hint="用逗号分隔，例如竞品">
            <input className="input" value={f.avoidBrands} onChange={set("avoidBrands")} />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card space-y-3">
          <p className="label">产品图片（可选，最多 3 张）</p>
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <button
                type="button"
                key={i}
                title="点击移除"
                onClick={() => setImages(images.filter((_, j) => j !== i))}
                className="aspect-square overflow-hidden rounded-lg border border-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          {images.length < 3 && (
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="text-sm" onChange={(e) => addImages(e.target.files)} />
          )}
          <p className="hint">图片会压缩后发送给 AI 识别细节，不会公开。</p>
        </div>

        <button className="btn-accent w-full py-3 text-base" disabled={busy}>
          {busy ? "生成中…" : "生成 listing"}
        </button>
        {busy && (
          <div className="card space-y-2 text-sm">
            <div className="h-1.5 overflow-hidden rounded bg-stone-100">
              <div className="h-full animate-pulse bg-accent" style={{ width: `${25 + stage * 25}%` }} />
            </div>
            <p>{STAGES[stage]}</p>
            <p className="hint">通常需要 20–60 秒，请不要关闭页面。</p>
          </div>
        )}
        {error && (
          <div className="card space-y-2 border-red-200 bg-red-50 text-sm text-bad">
            <p>{error.msg}</p>
            {error.quota && <Link href="/app/account" className="btn-accent">升级 Pro</Link>}
            {error.id && <Link href={`/app/listings/${error.id}`} className="underline">查看这次失败的记录</Link>}
          </div>
        )}
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="hint mt-1">{hint}</p>}
    </div>
  );
}

/** Resize to at most 1024px and re-encode as JPEG so the request stays far below Vercel's 4.5 MB body limit. */
async function downscale(file: File): Promise<Img> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const preview = canvas.toDataURL("image/jpeg", 0.82);
  return { mediaType: "image/jpeg", data: preview.split(",")[1], preview };
}
