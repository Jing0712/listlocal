import Link from "next/link";
import { freeLimitPublic } from "@/lib/public-config";

const steps = [
  { n: "1", t: "填中文产品信息", d: "产品名、卖点、参数，可以附上产品图。" },
  { n: "2", t: "AI 写美国站 listing", d: "标题、五点描述、产品描述、后台搜索词，按美国买家的习惯写。" },
  { n: "3", t: "规则引擎逐条检查", d: "医疗宣称、抗菌宣称、侵权品牌词、字符和字节上限，每条问题都附依据。" },
  { n: "4", t: "自动修正并给你复核", d: "有问题就让 AI 修一轮再查；还剩的风险明确标出来交给你决定。" },
];

const vsChat = [
  ["规则检查", "每次都跑同一套确定性规则，结果可复现、有出处", "靠模型自觉，容易漏，也说不出依据"],
  ["参数真实性", "自动比对你提供的数字，标出 AI 可能编造的参数", "常常“补全”不存在的参数"],
  ["字节和字符上限", "程序精确计算（后台搜索词按 UTF-8 字节）", "大模型数不准字符"],
  ["历史记录", "每个 listing 的初稿、问题、修正版都保存", "对话一长就找不到了"],
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="grid gap-8 pt-6 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="space-y-5">
          <p className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            给做 Amazon 美国站的中国卖家
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            中文产品信息进去，
            <br />
            <span className="text-accent">能直接上架</span>的英文 listing 出来
          </h1>
          <p className="text-lg text-muted">
            不只是翻译。ListLocal 按美国买家的习惯重写文案，再用规则引擎检查医疗宣称、抗菌宣称、侵权品牌词和字数上限，帮你在被下架之前发现问题。
          </p>
          <div className="flex gap-3">
            <Link href="/signup" className="btn-accent px-5 py-2.5 text-base">
              免费生成 {freeLimitPublic} 个 listing
            </Link>
            <Link href="/login" className="btn-ghost px-5 py-2.5 text-base">
              登录
            </Link>
          </div>
        </div>
        <div className="card space-y-3 text-sm shadow-sm">
          <p className="text-muted">卖家输入</p>
          <p className="rounded-lg bg-stone-50 p-3">硅胶折叠水杯，食品级，抗菌，能治疗口腔溃疡，500ml，适合露营</p>
          <p className="text-muted">ListLocal 输出</p>
          <p className="rounded-lg bg-stone-50 p-3 font-medium">
            Collapsible Silicone Water Cup, 16.9 oz (500 ml) Food-Grade Travel Cup for Camping and Hiking
          </p>
          <ul className="space-y-1 text-xs">
            <li className="text-bad">● 已删除 &quot;抗菌&quot;：属于 EPA 农药宣称</li>
            <li className="text-bad">● 已删除 &quot;治疗口腔溃疡&quot;：属于 FDA 疾病宣称</li>
            <li className="text-ok">● 500ml → 16.9 oz：单位换算已核对</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">怎么用</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="card">
              <div className="mb-2 text-2xl font-bold text-accent">{s.n}</div>
              <div className="font-medium">{s.t}</div>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">为什么不直接问 ChatGPT？</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2 pr-4 font-medium"></th>
                <th className="py-2 pr-4 font-medium">ListLocal</th>
                <th className="py-2 font-medium">通用聊天 AI</th>
              </tr>
            </thead>
            <tbody>
              {vsChat.map(([k, a, b]) => (
                <tr key={k} className="border-b border-line align-top">
                  <td className="py-3 pr-4 font-medium">{k}</td>
                  <td className="py-3 pr-4">{a}</td>
                  <td className="py-3 text-muted">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="pricing">
        <h2 className="mb-6 text-2xl font-semibold">价格</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card">
            <div className="text-lg font-semibold">免费版</div>
            <div className="my-2 text-3xl font-bold">$0</div>
            <ul className="space-y-1 text-sm text-muted">
              <li>生成 {freeLimitPublic} 个 listing</li>
              <li>无限次检查已有 listing</li>
              <li>保存全部历史记录</li>
            </ul>
          </div>
          <div className="card border-accent">
            <div className="text-lg font-semibold">Pro</div>
            <div className="my-2 text-3xl font-bold">
              $19<span className="text-base font-normal text-muted"> / 月</span>
            </div>
            <ul className="space-y-1 text-sm text-muted">
              <li>无限生成 listing</li>
              <li>图片识别产品细节</li>
              <li>随时在 Stripe 页面取消</li>
            </ul>
            <p className="mt-3 text-xs text-muted">演示环境使用 Stripe 测试模式，不会真实扣款。</p>
          </div>
        </div>
      </section>
    </div>
  );
}
