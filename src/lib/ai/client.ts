import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { numberEnv, optionalEnv, requireEnv } from "@/lib/env";
import type { MessagesClient, PipelineOptions } from "./pipeline";

let client: Anthropic | undefined;

export function pipelineOptions(): PipelineOptions {
  if (!client) {
    // One SDK retry for 429/5xx. Worst case (generate + repair, each timing out and retrying)
    // stays under the route's maxDuration of 180 s.
    client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY"), timeout: 40_000, maxRetries: 1 });
  }
  return {
    client: client as unknown as MessagesClient,
    model: optionalEnv("ANTHROPIC_MODEL", "claude-sonnet-4-5"),
    priceInPerMTok: numberEnv("ANTHROPIC_PRICE_IN_PER_MTOK", 3),
    priceOutPerMTok: numberEnv("ANTHROPIC_PRICE_OUT_PER_MTOK", 15),
    maxRepairs: 1,
  };
}
