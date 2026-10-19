/**
 * End-to-end generation eval against the real model (costs a few cents).
 * Calls the same pipeline the API uses, so a pass here means the product works.
 *
 *   ANTHROPIC_API_KEY=... npm run eval:gen
 *
 * Writes evals/results/generation-<timestamp>.json with every output, issue, cost and latency.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { runPipeline, type MessagesClient } from "../src/lib/ai/pipeline";
import { ProductInputSchema } from "../src/lib/ai/schema";

type Case = { id: string; input: unknown; mustNotContain: string[] };
const { cases } = JSON.parse(readFileSync(new URL("./generation-cases.json", import.meta.url), "utf8")) as { cases: Case[] };

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error("Set ANTHROPIC_API_KEY to run the generation eval.");
  process.exit(2);
}
const client = new Anthropic({ apiKey: key, timeout: 60_000, maxRetries: 1 }) as unknown as MessagesClient;
const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

const results: Array<Record<string, unknown>> = [];
let passed = 0;
for (const c of cases) {
  const input = ProductInputSchema.parse(c.input);
  const t = Date.now();
  try {
    const r = await runPipeline(input, { client, model, priceInPerMTok: 3, priceOutPerMTok: 15, maxRepairs: 1 });
    const text = JSON.stringify(r.final).toLowerCase();
    const leaked = c.mustNotContain.filter((s) => text.includes(s.toLowerCase()));
    const errors = r.finalIssues.filter((i) => i.severity === "error");
    const invented = r.finalIssues.filter((i) => i.ruleId === "unsupported-number");
    const checks = {
      noErrors: errors.length === 0,
      noForbiddenText: leaked.length === 0,
      noInventedNumbers: invented.length === 0,
      fiveBullets: r.final.bullets.length === 5,
    };
    const pass = Object.values(checks).every(Boolean);
    if (pass) passed++;
    console.log(
      `${pass ? "PASS" : "FAIL"}  ${c.id}  repaired=${r.repaired}  $${r.costUsd.toFixed(4)}  ${((Date.now() - t) / 1000).toFixed(1)}s` +
        (pass ? "" : `  ${JSON.stringify({ leaked, errors: errors.map((e) => `${e.ruleId}:${e.match}`), invented: invented.map((i) => i.match) })}`),
    );
    results.push({ id: c.id, pass, checks, leaked, latencyMs: Date.now() - t, ...r });
  } catch (e) {
    console.log(`FAIL  ${c.id}  error: ${(e as Error).message}`);
    results.push({ id: c.id, pass: false, error: (e as Error).message, latencyMs: Date.now() - t });
  }
}

const out = {
  ranAt: new Date().toISOString(),
  model,
  passed,
  total: cases.length,
  totalCostUsd: results.reduce((s, r) => s + (typeof r.costUsd === "number" ? r.costUsd : 0), 0),
  results,
};
mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
const file = `generation-${out.ranAt.replace(/[:.]/g, "-")}.json`;
writeFileSync(new URL(`./results/${file}`, import.meta.url), JSON.stringify(out, null, 2));
console.log(`\n${passed}/${cases.length} passed, total cost $${out.totalCostUsd.toFixed(4)} → evals/results/${file}`);
process.exit(passed === cases.length ? 0 : 1);
