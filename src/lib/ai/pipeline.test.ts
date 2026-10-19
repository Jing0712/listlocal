import { describe, expect, it } from "vitest";
import { AiError, runPipeline, type MessagesClient } from "./pipeline";
import { ProductInputSchema } from "./schema";

const input = ProductInputSchema.parse({
  productName: "硅胶折叠水杯",
  description: "食品级硅胶折叠杯，抗菌，适合露营。",
  specs: "容量 500ml；重量 85g",
  ownBrand: "Trailmate",
});

const good = {
  title: "Trailmate Collapsible Silicone Cup, 16.9 oz Travel Cup for Camping",
  bullets: [
    "Packs Flat: Folds down small enough to fit in a jacket pocket",
    "Food-Grade Silicone: Made for hot and cold drinks on the trail",
    "Lightweight: Weighs about 3 ounces (85 g) in your pack",
    "Easy to Clean: Rinse with warm soapy water after each trip",
    "Built for Outdoors: A simple cup for camping, hiking and road trips",
  ],
  description: "A cup that folds flat when you don't need it.",
  searchTerms: "foldable mug backpacking drinkware",
  riskFlags: [{ field: "description", text: "抗菌", reasonZh: "属于农药宣称" }],
  notesZh: ["容量换算成 oz"],
  missingInfoZh: [],
};

function fakeClient(outputs: Array<unknown | Error>): MessagesClient & { calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = [];
  return {
    calls,
    messages: {
      async create(body) {
        calls.push(body);
        const next = outputs.shift();
        if (next instanceof Error) throw next;
        return {
          content: [{ type: "tool_use", id: `toolu_${calls.length}`, name: "submit_listing", input: next }],
          usage: { input_tokens: 1000, output_tokens: 500 },
          stop_reason: "tool_use",
        };
      },
    },
  };
}

const opts = (client: MessagesClient) => ({ client, model: "test-model", priceInPerMTok: 3, priceOutPerMTok: 15 });

describe("runPipeline", () => {
  it("returns a clean listing without a repair call", async () => {
    const client = fakeClient([good]);
    const r = await runPipeline(input, opts(client));
    expect(client.calls).toHaveLength(1);
    expect(r.repaired).toBe(false);
    expect(r.finalIssues.filter((i) => i.severity === "error")).toEqual([]);
    expect(r.aiRiskFlags[0].text).toBe("抗菌");
    expect(r.costUsd).toBeCloseTo((1000 * 3 + 500 * 15) / 1e6);
  });

  it("repairs once when the deterministic check finds errors", async () => {
    const bad = { ...good, bullets: [...good.bullets.slice(0, 4), "Antibacterial silicone keeps germs away"] };
    const client = fakeClient([bad, good]);
    const r = await runPipeline(input, opts(client));
    expect(client.calls).toHaveLength(2);
    expect(r.repaired).toBe(true);
    expect(r.draftIssues.some((i) => i.ruleId === "pesticide-claim")).toBe(true);
    expect(r.finalIssues.some((i) => i.ruleId === "pesticide-claim")).toBe(false);
    expect(r.tokens).toEqual({ in: 2000, out: 1000 });
    // The repair request must reference the actual tool_use id from the first response.
    const msgs = client.calls[1].messages as Array<{ role: string; content: Array<{ type: string; id?: string; tool_use_id?: string }> }>;
    expect(msgs[1].content[0].id).toBe("toolu_1");
    expect(msgs[2].content[0].tool_use_id).toBe("toolu_1");
    const repairText = JSON.stringify(msgs[2].content[1]);
    expect(repairText).toContain("pesticide-claim");
  });

  it("stops after one repair even if problems remain, and reports them", async () => {
    const bad = { ...good, title: "Best Seller Cup!" };
    const client = fakeClient([bad, bad]);
    const r = await runPipeline(input, opts(client));
    expect(client.calls).toHaveLength(2);
    expect(r.finalIssues.some((i) => i.severity === "error")).toBe(true);
  });

  it("fails loud on provider errors instead of returning a fallback", async () => {
    const client = fakeClient([new Error("529 overloaded")]);
    await expect(runPipeline(input, opts(client))).rejects.toBeInstanceOf(AiError);
  });

  it("fails loud on malformed model output", async () => {
    const client = fakeClient([{ title: "only a title" }]);
    await expect(runPipeline(input, opts(client))).rejects.toThrow(/invalid listing/);
  });

  it("sends images before the text and never puts seller text in the system prompt", async () => {
    const withImg = ProductInputSchema.parse({ ...input, images: [{ mediaType: "image/jpeg", data: "abc" }] });
    const client = fakeClient([good]);
    await runPipeline(withImg, opts(client));
    const first = (client.calls[0].messages as Array<{ content: Array<{ type: string; text?: string }> }>)[0].content;
    expect(first[0].type).toBe("image");
    expect(first[1].text).toContain("<seller_input>");
    expect(String(client.calls[0].system)).not.toContain("硅胶");
  });
});
