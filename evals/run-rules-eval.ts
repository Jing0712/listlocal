/**
 * Rule-engine eval: runs every labeled case and reports, per rule,
 * how many expected hits fired (recall) and how many forbidden hits fired (false positives).
 * No network, no API key. Exit code 1 if any expectation fails, so CI can gate on it.
 *
 *   npm run eval:rules
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { checkListing } from "../src/lib/compliance/check";
import type { CheckContext, Listing } from "../src/lib/compliance/types";

type Case = { id: string; listing: Listing; ctx?: CheckContext; expect: string[]; forbid: string[] };
const { cases } = JSON.parse(readFileSync(new URL("./rules-cases.json", import.meta.url), "utf8")) as { cases: Case[] };

let failures = 0;
const perRule = new Map<string, { expected: number; hit: number; forbiddenFired: number }>();
const bump = (rule: string, k: "expected" | "hit" | "forbiddenFired") => {
  const r = perRule.get(rule) ?? { expected: 0, hit: 0, forbiddenFired: 0 };
  r[k]++;
  perRule.set(rule, r);
};

const rows = cases.map((c) => {
  const fired = new Set(checkListing(c.listing, c.ctx).map((i) => i.ruleId));
  const missed = c.expect.filter((r) => !fired.has(r));
  const falsePos = c.forbid.filter((r) => fired.has(r));
  c.expect.forEach((r) => {
    bump(r, "expected");
    if (fired.has(r)) bump(r, "hit");
  });
  falsePos.forEach((r) => bump(r, "forbiddenFired"));
  const pass = missed.length === 0 && falsePos.length === 0;
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${c.id}${missed.length ? `  missed=${missed}` : ""}${falsePos.length ? `  falsePositive=${falsePos}` : ""}`);
  return { id: c.id, pass, fired: [...fired], missed, falsePos };
});

const summary = {
  ranAt: new Date().toISOString(),
  cases: cases.length,
  passed: cases.length - failures,
  rules: Object.fromEntries([...perRule].map(([k, v]) => [k, { ...v, recall: v.expected ? v.hit / v.expected : null }])),
  rows,
};
mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
writeFileSync(new URL("./results/rules.json", import.meta.url), JSON.stringify(summary, null, 2));
console.log(`\n${summary.passed}/${summary.cases} cases passed → evals/results/rules.json`);
process.exit(failures ? 1 : 0);
