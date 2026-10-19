import { NextResponse } from "next/server";
import { collections } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { HttpError, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { refundGeneration, reserveGeneration } from "@/lib/quota";
import { ProductInputSchema } from "@/lib/ai/schema";
import { AiError, runPipeline } from "@/lib/ai/pipeline";
import { pipelineOptions } from "@/lib/ai/client";

export const maxDuration = 180;

/** Generate a localized listing. Creates a history record first so failures are visible too. */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  await rateLimit(`gen:${user._id.toHexString()}`, 10, 600);
  const input = ProductInputSchema.parse(await readJson(req));

  await reserveGeneration(user._id);
  const { listings } = await collections();
  const { images, ...inputWithoutImages } = input;
  const started = Date.now();
  const { insertedId } = await listings.insertOne({
    userId: user._id,
    createdAt: new Date(),
    status: "running",
    productName: input.productName,
    input: inputWithoutImages,
    imageCount: images.length,
    steps: [],
  });

  try {
    const { steps, ...result } = await runPipeline(input, pipelineOptions());
    const latencyMs = Date.now() - started;
    await listings.updateOne({ _id: insertedId }, { $set: { status: "done", result, steps, latencyMs } });
    console.log(
      JSON.stringify({
        level: "info",
        event: "listing.done",
        listingId: insertedId.toHexString(),
        userId: user._id.toHexString(),
        latencyMs,
        tokens: result.tokens,
        costUsd: result.costUsd,
        repaired: result.repaired,
        draftErrors: result.draftIssues.filter((i) => i.severity === "error").length,
        finalErrors: result.finalIssues.filter((i) => i.severity === "error").length,
      }),
    );
    return NextResponse.json({ id: insertedId.toHexString() }, { status: 201 });
  } catch (e) {
    // Record the real failure, give the quota back, and tell the client the truth (502).
    const message = e instanceof Error ? e.message : String(e);
    const steps = e instanceof AiError ? e.steps : [];
    await listings.updateOne(
      { _id: insertedId },
      { $set: { status: "failed", error: message, steps, latencyMs: Date.now() - started } },
    );
    await refundGeneration(user._id);
    console.error(JSON.stringify({ level: "error", event: "listing.failed", listingId: insertedId.toHexString(), message }));
    if (e instanceof AiError) {
      throw new HttpError(502, "The AI service failed. This attempt was not counted against your quota; please try again.", { id: insertedId.toHexString(), detail: message });
    }
    throw e;
  }
});

export const GET = route(async () => {
  const user = await requireUser();
  const { listings } = await collections();
  const rows = await listings
    .find({ userId: user._id }, { projection: { productName: 1, createdAt: 1, status: 1, "result.finalIssues": 1, "result.final.title": 1 } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return NextResponse.json({
    items: rows.map((r) => ({
      id: r._id.toHexString(),
      productName: r.productName,
      createdAt: r.createdAt,
      status: r.status,
      title: r.result?.final.title ?? null,
      errors: r.result?.finalIssues.filter((i) => i.severity === "error").length ?? null,
      warnings: r.result?.finalIssues.filter((i) => i.severity === "warning").length ?? null,
    })),
  });
});
