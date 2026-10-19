import { z } from "zod";

/** What the seller submits. Limits keep prompts bounded and requests under Vercel's body limit. */
export const ProductInputSchema = z.object({
  productName: z.string().trim().min(1, "请填写产品名称").max(200),
  category: z.string().trim().max(100).default(""),
  description: z.string().trim().min(10, "产品描述至少 10 个字").max(4000),
  specs: z.string().trim().max(2000).default(""),
  targetCustomer: z.string().trim().max(500).default(""),
  ownBrand: z.string().trim().max(60).default(""),
  avoidBrands: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  images: z
    .array(
      z.object({
        mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        // base64 without the data: prefix; ~1 MB decoded max per image (client downsizes first)
        data: z.string().max(1_400_000),
      }),
    )
    .max(3)
    .default([]),
});
export type ProductInput = z.infer<typeof ProductInputSchema>;

/** What the model must return through the `submit_listing` tool. */
export const ModelListingSchema = z.object({
  title: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(3).max(7),
  description: z.string(),
  searchTerms: z.string(),
  riskFlags: z
    .array(z.object({ field: z.string(), text: z.string(), reasonZh: z.string() }))
    .default([]),
  notesZh: z.array(z.string()).default([]),
  missingInfoZh: z.array(z.string()).default([]),
});
export type ModelListing = z.infer<typeof ModelListingSchema>;

/** JSON Schema handed to Claude as the tool's input_schema. Kept in sync with ModelListingSchema. */
export const SUBMIT_LISTING_TOOL = {
  name: "submit_listing",
  description: "Submit the finished US Amazon listing plus notes for the seller.",
  input_schema: {
    type: "object" as const,
    required: ["title", "bullets", "description", "searchTerms", "riskFlags", "notesZh", "missingInfoZh"],
    properties: {
      title: { type: "string", description: "Product title, US English, at most 200 characters (aim for 80-150)." },
      bullets: {
        type: "array",
        items: { type: "string" },
        minItems: 5,
        maxItems: 5,
        description: "Exactly five bullet points, each 'Short Header: benefit-led detail', under 220 characters, no emojis or symbols.",
      },
      description: { type: "string", description: "Plain-text product description, 2-4 short paragraphs, under 1500 characters." },
      searchTerms: {
        type: "string",
        description: "Backend search terms: space-separated, lowercase, under 230 bytes, no brand names, no words already in the title.",
      },
      riskFlags: {
        type: "array",
        description: "Claims in the SELLER INPUT that you deliberately left out or softened because they are risky on Amazon US.",
        items: {
          type: "object",
          required: ["field", "text", "reasonZh"],
          properties: {
            field: { type: "string", description: "Where the claim came from, e.g. 'description' or 'specs'." },
            text: { type: "string", description: "The risky claim as the seller wrote it." },
            reasonZh: { type: "string", description: "Why it is risky, in Simplified Chinese, one sentence." },
          },
        },
      },
      notesZh: {
        type: "array",
        items: { type: "string" },
        description: "2-5 short notes in Simplified Chinese explaining key localization choices (tone, units, keywords).",
      },
      missingInfoZh: {
        type: "array",
        items: { type: "string" },
        description: "Facts a US buyer expects that the seller did not provide (in Simplified Chinese). Never invent them.",
      },
    },
  },
};
