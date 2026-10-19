/**
 * Public sources behind each deterministic rule.
 *
 * Amazon's own policy pages live inside Seller Central and need a seller login,
 * so several rules cite public summaries of those pages. Each source says which
 * kind it is, and `lastReviewed` records when a human last re-read it.
 * Re-check these before relying on the tool for a real listing.
 */
export type Source = {
  id: string;
  title: string;
  url: string;
  kind: "regulator" | "amazon" | "secondary";
  lastReviewed: string; // YYYY-MM-DD
};

export const SOURCES = {
  amazonTitle2025: {
    id: "amazonTitle2025",
    title: "Amazon product title requirements effective Jan 21, 2025 (summary)",
    url: "https://searchengineland.com/?p=450485",
    kind: "secondary",
    lastReviewed: "2026-10-19",
  },
  amazonBullets: {
    id: "amazonBullets",
    title: "Amazon bullet point guidelines (summary of Seller Central style guide)",
    url: "https://www.ecomengine.com/blog/amazon-bullet-point-guidelines",
    kind: "secondary",
    lastReviewed: "2026-10-19",
  },
  amazonSearchTerms: {
    id: "amazonSearchTerms",
    title: "Amazon backend search terms: 250-byte limit and exclusions (summary)",
    url: "https://myamazonguy.com/seo/amazon-backend-keywords/",
    kind: "secondary",
    lastReviewed: "2026-10-19",
  },
  fdaCosmeticOrDrug: {
    id: "fdaCosmeticOrDrug",
    title: "FDA: Is It a Cosmetic, a Drug, or Both? (disease claims make a product a drug)",
    url: "https://www.fda.gov/cosmetics/laws-regulations/it-cosmetic-drug-or-both-or-it-soap",
    kind: "regulator",
    lastReviewed: "2026-10-19",
  },
  epaTreatedArticles: {
    id: "epaTreatedArticles",
    title: "EPA PRN 2000-1: antimicrobial claims and the treated-articles exemption",
    url: "https://19january2025snapshot.epa.gov/pesticide-registration/prn-2000-1-applicability-treated-articles-exemption-antimicrobial-pesticides",
    kind: "regulator",
    lastReviewed: "2026-10-19",
  },
  ftcGreenGuides: {
    id: "ftcGreenGuides",
    title: "FTC Green Guides, 16 CFR Part 260 (unqualified environmental claims)",
    url: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-260",
    kind: "regulator",
    lastReviewed: "2026-10-19",
  },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;
