import { checkListing, summarize } from "@/lib/compliance/check";
import type { Issue, Listing } from "@/lib/compliance/types";
import { buildRepairText, buildUserText, SYSTEM_PROMPT, sourceTextOf } from "./prompt";
import { ModelListingSchema, SUBMIT_LISTING_TOOL, type ModelListing, type ProductInput } from "./schema";

/**
 * The minimal slice of the Anthropic client we use. Tests pass a fake;
 * production passes `new Anthropic()`. Keeping it this narrow makes the
 * pipeline easy to test without network access.
 */
export type MessagesClient = {
  messages: {
    create(body: Record<string, unknown>): Promise<{
      content: Array<{ type: string; name?: string; input?: unknown; text?: string }>;
      usage: { input_tokens: number; output_tokens: number };
      stop_reason?: string | null;
    }>;
  };
};

export type Step = { name: "generate" | "check" | "repair" | "recheck"; ms: number; ok: boolean; detail?: string };

export type PipelineResult = {
  draft: Listing;
  draftIssues: Issue[];
  final: Listing;
  finalIssues: Issue[];
  repaired: boolean;
  aiRiskFlags: ModelListing["riskFlags"];
  notesZh: string[];
  missingInfoZh: string[];
  tokens: { in: number; out: number };
  costUsd: number;
  model: string;
  steps: Step[];
};

/** Thrown when the model or provider fails. The route turns this into a 502; there is no fallback text. */
export class AiError extends Error {
  constructor(message: string, readonly steps: Step[] = []) {
    super(message);
    this.name = "AiError";
  }
}

export type PipelineOptions = {
  client: MessagesClient;
  model: string;
  priceInPerMTok: number;
  priceOutPerMTok: number;
  maxRepairs?: number;
};

export async function runPipeline(input: ProductInput, opts: PipelineOptions): Promise<PipelineResult> {
  const steps: Step[] = [];
  const tokens = { in: 0, out: 0 };
  const ctx = { ownBrand: input.ownBrand || undefined, avoidBrands: input.avoidBrands, sourceText: sourceTextOf(input) };

  const userContent: Array<Record<string, unknown>> = [
    ...input.images.map((img) => ({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    })),
    { type: "text", text: buildUserText(input) },
  ];
  const messages: Array<Record<string, unknown>> = [{ role: "user", content: userContent }];

  // 1. Generate
  const gen = await callTool(opts, messages, tokens, steps, "generate");
  const draft = toListing(gen.listing);

  // 2. Deterministic check
  let t = Date.now();
  const draftIssues = checkListing(draft, ctx);
  steps.push({ name: "check", ms: Date.now() - t, ok: true, detail: fmt(summarize(draftIssues)) });

  let final = draft;
  let finalIssues = draftIssues;
  let latest = gen.listing;
  let repaired = false;
  let lastToolUseId = gen.toolUseId;

  // 3. Repair loop: only errors and warnings are sent back; info items are suggestions.
  const maxRepairs = opts.maxRepairs ?? 1;
  for (let round = 0; round < maxRepairs; round++) {
    const actionable = finalIssues.filter((i) => i.severity !== "info");
    if (actionable.length === 0) break;

    messages.push({ role: "assistant", content: [{ type: "tool_use", id: lastToolUseId, name: SUBMIT_LISTING_TOOL.name, input: latest }] });
    messages.push({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: lastToolUseId, content: "Received. Compliance check found problems." },
        { type: "text", text: buildRepairText(final, actionable) },
      ],
    });
    const fix = await callTool(opts, messages, tokens, steps, "repair");
    lastToolUseId = fix.toolUseId;
    latest = mergeNotes(latest, fix.listing);
    final = toListing(fix.listing);
    repaired = true;

    t = Date.now();
    finalIssues = checkListing(final, ctx);
    steps.push({ name: "recheck", ms: Date.now() - t, ok: true, detail: fmt(summarize(finalIssues)) });
  }

  const costUsd = (tokens.in * opts.priceInPerMTok + tokens.out * opts.priceOutPerMTok) / 1_000_000;
  return {
    draft,
    draftIssues,
    final,
    finalIssues,
    repaired,
    aiRiskFlags: latest.riskFlags,
    notesZh: latest.notesZh,
    missingInfoZh: latest.missingInfoZh,
    tokens,
    costUsd: Math.round(costUsd * 1e6) / 1e6,
    model: opts.model,
    steps,
  };
}

async function callTool(
  opts: PipelineOptions,
  messages: Array<Record<string, unknown>>,
  tokens: { in: number; out: number },
  steps: Step[],
  name: "generate" | "repair",
): Promise<{ listing: ModelListing; toolUseId: string }> {
  const t = Date.now();
  let res;
  try {
    res = await opts.client.messages.create({
      model: opts.model,
      max_tokens: 2500,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      tools: [SUBMIT_LISTING_TOOL],
      tool_choice: { type: "tool", name: SUBMIT_LISTING_TOOL.name },
      messages,
    });
  } catch (e) {
    steps.push({ name, ms: Date.now() - t, ok: false, detail: errMsg(e) });
    // Fail loud: the caller gets the real provider error, never a made-up listing.
    throw new AiError(`AI provider error during ${name}: ${errMsg(e)}`, steps);
  }
  tokens.in += res.usage?.input_tokens ?? 0;
  tokens.out += res.usage?.output_tokens ?? 0;

  const block = res.content.find((b) => b.type === "tool_use" && b.name === SUBMIT_LISTING_TOOL.name);
  if (!block) {
    steps.push({ name, ms: Date.now() - t, ok: false, detail: `no tool call (stop_reason=${res.stop_reason})` });
    throw new AiError(`Model did not return a listing (stop_reason=${res.stop_reason ?? "unknown"})`, steps);
  }
  const parsed = ModelListingSchema.safeParse(block.input);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    steps.push({ name, ms: Date.now() - t, ok: false, detail: `invalid output: ${detail}` });
    throw new AiError(`Model returned an invalid listing: ${detail}`, steps);
  }
  steps.push({ name, ms: Date.now() - t, ok: true });
  return { listing: parsed.data, toolUseId: (block as { id?: string }).id ?? `toolu_${name}` };
}

function toListing(m: ModelListing): Listing {
  return { title: m.title.trim(), bullets: m.bullets.map((b) => b.trim()), description: m.description.trim(), searchTerms: m.searchTerms.trim() };
}

function mergeNotes(prev: ModelListing, next: ModelListing): ModelListing {
  const uniq = <T,>(xs: T[], key: (x: T) => string) => [...new Map(xs.map((x) => [key(x), x])).values()];
  return {
    ...next,
    riskFlags: uniq([...prev.riskFlags, ...next.riskFlags], (r) => r.text.toLowerCase()),
    notesZh: next.notesZh.length ? next.notesZh : prev.notesZh,
    missingInfoZh: uniq([...prev.missingInfoZh, ...next.missingInfoZh], (s) => s),
  };
}

function fmt(s: { errors: number; warnings: number; infos: number }) {
  return `${s.errors} errors, ${s.warnings} warnings, ${s.infos} info`;
}

function errMsg(e: unknown) {
  if (e instanceof Error) return e.message.slice(0, 300);
  return String(e).slice(0, 300);
}
