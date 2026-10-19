"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";

type Img = { mediaType: "image/jpeg"; data: string; preview: string };
type Quota = { plan: "free" | "pro"; used: number; limit: number | null; remaining: number | null };

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

// Time-based hints only: the request is a single call. The real step log is on the result page.
const STAGES = ["Writing your listing…", "Checking every line against the rules…", "Fixing what the check found…", "Almost done…"];

export function GenerateForm({ initialName, quota }: { initialName: string; quota: Quota }) {
  const [f, setF] = useState({ productName: initialName, category: "", description: "", specs: "", targetCustomer: "", ownBrand: "", avoidBrands: "" });
  const [images, setImages] = useState<Img[]>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<{ msg: string; quota?: boolean; id?: string } | null>(null);
  const outOfQuota = quota.remaining === 0;

  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 10000);
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
        setError({ msg: `Could not read ${file.name}. Try a JPG or PNG.` });
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

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="panel space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Product details</h2>
          <button type="button" className="btn-quiet" onClick={() => setF(SAMPLE)}>
            Fill in an example
          </button>
        </div>
        <Field label="Product name" required hint="Chinese is fine">
          <input className="field" required maxLength={200} value={f.productName} onChange={set("productName")} />
        </Field>
        <Field label="Category">
          <input className="field" maxLength={100} value={f.category} onChange={set("category")} placeholder="e.g. Kitchen, Pet toys, 户外用品" />
        </Field>
        <Field label="Description and selling points" required hint="Materials, uses, and what makes it better than similar products">
          <textarea className="field min-h-32" required minLength={10} maxLength={4000} value={f.description} onChange={set("description")} />
        </Field>
        <Field label="Specs" hint="Size, weight, capacity, colors, what's in the box. The AI will only use numbers you put here.">
          <textarea className="field min-h-20" maxLength={2000} value={f.specs} onChange={set("specs")} />
        </Field>
        <Field label="Who buys it">
          <input className="field" maxLength={500} value={f.targetCustomer} onChange={set("targetCustomer")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your brand name">
            <input className="field" maxLength={60} value={f.ownBrand} onChange={set("ownBrand")} />
          </Field>
          <Field label="Brands to keep out" hint="Competitors, separated by commas">
            <input className="field" value={f.avoidBrands} onChange={set("avoidBrands")} />
          </Field>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="panel">
          <p className="text-sm text-muted">Your plan</p>
          {quota.limit === null ? (
            <p className="mt-1 text-2xl font-extrabold text-tao">Pro, unlimited</p>
          ) : (
            <>
              <p className="mt-1">
                <span className="text-4xl font-extrabold text-tao">{quota.remaining}</span>
                <span className="text-muted"> of {quota.limit} free listings left</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-page">
                <div className="tao-gradient h-full rounded-full" style={{ width: `${(100 * (quota.remaining ?? 0)) / quota.limit}%` }} />
              </div>
              <Link href="/app/account" className="mt-3 inline-block text-sm font-semibold text-tao">
                Get unlimited with Pro
              </Link>
            </>
          )}
        </div>

        <div className="panel space-y-3">
          <p className="font-bold">Product photos <span className="font-normal text-muted">(optional, up to 3)</span></p>
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <button
                type="button"
                key={i}
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setImages(images.filter((_, j) => j !== i))}
                className="aspect-square overflow-hidden rounded-lg border border-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            {images.length < 3 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-tao-line text-tao hover:bg-tao-soft">
                <span className="text-2xl leading-none">+</span>
                <span className="text-xs">Add</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => addImages(e.target.files)} />
              </label>
            )}
          </div>
          <p className="field-hint">Photos are resized and sent to the AI for this request only. They are not stored.</p>
        </div>

        {outOfQuota ? (
          <div className="panel space-y-3">
            <p className="font-bold">You have used your free listings</p>
            <p className="text-sm text-muted">Upgrade for unlimited listings. Checking listings you already have stays free.</p>
            <Link href="/app/account" className="btn-tao w-full">Upgrade to Pro</Link>
          </div>
        ) : (
          <button className="btn-tao w-full py-4 text-lg" disabled={busy}>
            {busy ? "Working…" : "Generate listing"}
          </button>
        )}

        {busy && (
          <div className="panel space-y-2 text-sm" role="status">
            <div className="h-2 overflow-hidden rounded-full bg-page">
              <div className="tao-gradient h-full rounded-full transition-[width] duration-1000" style={{ width: `${25 + stage * 22}%` }} />
            </div>
            <p className="font-semibold">{STAGES[stage]}</p>
            <p className="text-muted">Usually 20 to 60 seconds. Keep this page open.</p>
          </div>
        )}
        {error && (
          <div className="panel space-y-2 text-sm" role="alert">
            <p className="font-semibold text-bad">{error.msg}</p>
            {error.quota && <Link href="/app/account" className="btn-tao">Upgrade to Pro</Link>}
            {error.id && <Link href={`/app/listings/${error.id}`} className="font-semibold text-tao">See what happened</Link>}
          </div>
        )}
      </aside>
    </form>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">
        {label}
        {required && <span className="ml-0.5 text-tao">*</span>}
      </label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
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
