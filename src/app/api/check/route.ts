import { NextResponse } from "next/server";
import { z } from "zod";
import { collections } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { checkListing, summarize } from "@/lib/compliance/check";

const Body = z.object({
  title: z.string().max(1000).default(""),
  bullets: z.array(z.string().max(2000)).max(10).default([]),
  description: z.string().max(10000).default(""),
  searchTerms: z.string().max(2000).default(""),
  ownBrand: z.string().max(60).default(""),
  avoidBrands: z.array(z.string().max(60)).max(20).default([]),
});

/**
 * Check an existing listing with the deterministic rules only.
 * No LLM call, so it's free and doesn't use quota.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  await rateLimit(`check:${user._id.toHexString()}`, 60, 600);
  const b = Body.parse(await readJson(req));
  const listing = { title: b.title, bullets: b.bullets.filter((x) => x.trim()), description: b.description, searchTerms: b.searchTerms };
  const issues = checkListing(listing, { ownBrand: b.ownBrand || undefined, avoidBrands: b.avoidBrands });
  const { checks } = await collections();
  await checks.insertOne({ userId: user._id, createdAt: new Date(), listing, issues });
  return NextResponse.json({ issues, summary: summarize(issues) });
});
