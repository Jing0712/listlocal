import Link from "next/link";
import { currentUser } from "@/lib/auth/session";
import { freeLimitPublic } from "@/lib/public-config";
import { HeroSearch } from "@/components/HeroSearch";

// Illustrative before/after pairs built from the generation eval cases (evals/generation-cases.json).
const EXAMPLES = [
  {
    zh: "硅胶折叠水杯",
    input: "食品级硅胶，抗菌，还能缓解口腔溃疡，500ml",
    title: "Collapsible Silicone Water Cup, 16.9 oz (500 ml) Food-Grade Travel Cup with Carabiner for Camping",
    removed: ["antibacterial", "relieves mouth ulcers"],
    tint: "from-[#ffe7d6] to-[#ffd0b0]",
  },
  {
    zh: "40oz 带把手保温杯",
    input: "和 Stanley 同款，质量比 YETI 好，全网销量第一",
    title: "40 oz Insulated Tumbler with Handle and 2 Straws, Double-Wall Stainless Steel, Keeps Drinks Cold 24 Hours",
    removed: ["Stanley", "YETI", "best seller"],
    tint: "from-[#e5f0ff] to-[#cfe0ff]",
  },
  {
    zh: "记忆棉颈椎枕",
    input: "可以治疗颈椎病和失眠，医生推荐，竹纤维枕套",
    title: "Memory Foam Contour Pillow for Neck Support, 23.6 x 13.8 x 4.3 Inches, Removable Washable Cover",
    removed: ["treats insomnia", "doctor recommended", "made from bamboo"],
    tint: "from-[#e8f7ee] to-[#cdeedb]",
  },
];

const VS = [
  ["Policy checks", "The same rules run on every listing, and each finding links to its source", "Depends on what the model remembers; no sources"],
  ["Made-up specs", "Every number is matched against your product info, unit conversions included", "Often fills in plausible specs you never gave"],
  ["Character limits", "Counted by code, search terms in UTF-8 bytes", "Language models miscount characters"],
  ["Your history", "Every draft, finding and fix is saved per listing", "Lost in a long chat"],
];

export default async function Home() {
  const user = await currentUser().catch(() => null);
  return (
    <div className="space-y-6">
      {/* Hero: the search bar is the product's front door */}
      <section className="tao-gradient -mx-4 rounded-none px-4 py-12 sm:mx-0 sm:rounded-[20px] sm:px-10">
        <div className="flex flex-col items-center gap-6 text-center text-white">
          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-[44px] sm:leading-[1.1]">
            Chinese product info in. A compliance-checked US Amazon listing out.
          </h1>
          <p className="max-w-2xl text-base text-white/90 sm:text-lg">
            ListLocal rewrites your product for American shoppers, then checks it against Amazon and US advertising rules before you publish.
          </p>
          <HeroSearch loggedIn={Boolean(user)} />
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="rounded bg-white px-2 py-0.5 font-semibold text-tao">{freeLimitPublic} listings free</span>
            <span className="rounded bg-white px-2 py-0.5 font-semibold text-tao">No card to start</span>
            <span className="rounded bg-white px-2 py-0.5 font-semibold text-tao">Cancel any time</span>
          </div>
        </div>
      </section>

      {/* Item grid, Taobao-style: what actually happens to real input */}
      <section className="panel">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-extrabold">What sellers type, and what comes back</h2>
          <span className="text-sm text-muted">Illustrative, based on our test cases</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {EXAMPLES.map((e) => (
            <article key={e.zh} className="overflow-hidden rounded-xl border border-line">
              <div className={`bg-gradient-to-br ${e.tint} px-4 py-6`}>
                <p className="text-2xl font-extrabold">{e.zh}</p>
                <p className="mt-1 text-sm text-ink/70">“{e.input}”</p>
              </div>
              <div className="space-y-2 p-4">
                <p className="line-clamp-3 text-sm font-semibold leading-snug">{e.title}</p>
                <div className="flex flex-wrap gap-1">
                  <span className="tag tag-ok">Passed checks</span>
                  {e.removed.map((r) => (
                    <span key={r} className="tag">Removed “{r}”</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel">
          <h2 className="mb-4 text-xl font-extrabold">Why not just ask a chatbot?</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="pb-2 pr-4 font-medium"></th>
                  <th className="pb-2 pr-4 font-bold text-tao">ListLocal</th>
                  <th className="pb-2 font-medium">General chatbot</th>
                </tr>
              </thead>
              <tbody>
                {VS.map(([k, a, b]) => (
                  <tr key={k} className="border-t border-line align-top">
                    <td className="py-3 pr-4 font-bold">{k}</td>
                    <td className="py-3 pr-4">{a}</td>
                    <td className="py-3 text-muted">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2 className="mb-4 text-xl font-extrabold">How it works</h2>
          <ol className="space-y-4">
            {[
              ["Describe the product", "In Chinese is fine. Add photos if you have them."],
              ["AI writes the listing", "Title, five bullets, description and backend search terms."],
              ["Rules check every line", "Medical and antibacterial claims, competitor brands, limits, invented numbers."],
              ["Auto-fix, then you decide", "Problems go back to the AI once; anything left is flagged for you."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="tao-gradient flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold">{t}</p>
                  <p className="text-sm text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="pricing" className="grid gap-4 md:grid-cols-2">
        <div className="panel flex flex-col">
          <p className="font-bold">Free</p>
          <p className="my-2 text-tao">
            <span className="text-lg font-bold">$</span>
            <span className="text-5xl font-extrabold">0</span>
          </p>
          <ul className="mb-6 space-y-1 text-sm text-muted">
            <li>{freeLimitPublic} AI-written listings</li>
            <li>Unlimited checks of listings you already have</li>
            <li>Full history</li>
          </ul>
          <Link href={user ? "/app" : "/signup"} className="btn-line mt-auto self-start">
            {user ? "Create a listing" : "Sign up free"}
          </Link>
        </div>
        <div className="panel relative flex flex-col overflow-hidden ring-2 ring-tao">
          <span className="tao-gradient absolute right-0 top-0 rounded-bl-xl px-3 py-1 text-xs font-bold text-white">For active sellers</span>
          <p className="font-bold">Pro</p>
          <p className="my-2 text-tao">
            <span className="text-lg font-bold">$</span>
            <span className="text-5xl font-extrabold">19</span>
            <span className="text-base font-semibold text-muted"> / month</span>
          </p>
          <ul className="mb-6 space-y-1 text-sm text-muted">
            <li>Unlimited AI-written listings</li>
            <li>Photo understanding for product details</li>
            <li>Cancel any time from your billing page</li>
          </ul>
          <Link href={user ? "/app/account" : "/signup"} className="btn-tao mt-auto self-start">
            {user ? "Upgrade to Pro" : "Start free, upgrade later"}
          </Link>
          <p className="mt-3 text-xs text-muted">This demo uses Stripe test mode. No real charges.</p>
        </div>
      </section>
    </div>
  );
}
