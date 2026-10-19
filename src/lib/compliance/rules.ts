import { SOURCES, type SourceId } from "./sources";
import type { Severity } from "./types";

/**
 * Phrase rules: regex patterns that indicate a risky claim.
 * Patterns are matched case-insensitively on word boundaries.
 * `severityByField` lets one claim be an error in the title but a warning elsewhere.
 */
export type PhraseRule = {
  id: string;
  patterns: string[];
  severity: Severity;
  severityByField?: Partial<Record<FieldKind, Severity>>;
  message: string;
  fix: string;
  source: SourceId;
};

export type FieldKind = "title" | "bullets" | "description" | "searchTerms";

export const PHRASE_RULES: PhraseRule[] = [
  {
    id: "medical-claim",
    patterns: [
      "cures?",
      "heals?",
      "diagnos(?:e|es|is)",
      "treats? (?:acne|pain|insomnia|anxiety|depression|arthritis|eczema|psoriasis|disease|infection|inflammation)",
      "prevents? (?:disease|infection|illness|cancer|acne|covid|flu|colds?)",
      "pain relief",
      "relieves? pain",
      "anti[- ]?inflammatory",
      "fda[- ](?:approved|certified|registered)",
      "clinically proven",
      "boosts? (?:your )?immun(?:e|ity)(?: system)?",
      "insomnia",
      "arthritis",
      "cancer",
      "diabetes",
      "covid(?:-19)?",
    ],
    severity: "error",
    message: "Looks like a medical or disease claim. In the US, a product that claims to treat or prevent disease is regulated as a drug, and Amazon removes these listings.",
    fix: "Describe what the product does instead, e.g. change \"relieves back pain\" to \"ergonomic support for long hours of sitting\".",
    source: "fdaCosmeticOrDrug",
  },
  {
    id: "pesticide-claim",
    patterns: [
      "anti[- ]?bacterial",
      "anti[- ]?microbial",
      "anti[- ]?viral",
      "anti[- ]?fungal",
      "anti[- ]?mou?ld",
      "kills? (?:\\d+(?:\\.\\d+)?% (?:of )?)?(?:germs|bacteria|viruses|mou?ld|mildew)",
      "sanitiz(?:e|es|ing|er)",
      "disinfect(?:s|ant|ing)?",
      "germ[- ]free",
    ],
    severity: "error",
    message: "Antibacterial, germ-killing and disinfecting claims are pesticide claims in the US (EPA registration required). Amazon blocks them under its pesticide policy.",
    fix: "Remove the claim. If the material really is treated, you may only say the treatment protects the product itself, and only if it qualifies for the EPA treated-article exemption.",
    source: "epaTreatedArticles",
  },
  {
    id: "guarantee-language",
    patterns: [
      "full refund",
      "money[- ]back",
      "unconditional guarantee",
      "100% satisfaction",
      "satisfaction guaranteed",
      "risk[- ]free",
    ],
    severity: "error",
    message: "Refund and guarantee promises are not allowed in listing copy.",
    fix: "Remove it. Put warranty or return terms in the fields Amazon provides for them, not in the title or bullets.",
    source: "amazonBullets",
  },
  {
    id: "promotional-language",
    patterns: [
      "best[- ]?sellers?",
      "#\\s?1",
      "no\\.? ?1",
      "top[- ]rated",
      "free shipping",
      "on sale",
      "hot (?:sale|item|seller)",
      "limited time",
      "best deal",
      "discount",
      "cheapest",
    ],
    severity: "warning",
    severityByField: { title: "error", searchTerms: "error" },
    message: "Promotional words and rankings (best seller, #1, free shipping) are not allowed in the title or search terms, and are discouraged in bullets.",
    fix: "Replace them with specific, provable benefits such as material, size or use case.",
    source: "amazonSearchTerms",
  },
  {
    id: "environmental-claim",
    patterns: [
      "eco[- ]?friendly",
      "environmentally friendly",
      "earth[- ]friendly",
      "biodegradable",
      "compostable",
      "non[- ]?toxic",
      "sustainable",
      "green product",
    ],
    severity: "warning",
    message: "Broad environmental claims (eco-friendly, non-toxic) must be specific and backed by evidence under the FTC Green Guides, and Amazon restricts them.",
    fix: "Make it specific and provable, e.g. \"made with 30% recycled PET\", and keep the evidence on file.",
    source: "ftcGreenGuides",
  },
  {
    id: "bamboo-soy-claim",
    patterns: ["made (?:from|of) bamboo", "bamboo (?:fabric|fiber|viscose)", "made (?:from|of) soy"],
    severity: "warning",
    message: "Textile claims like \"made from bamboo\" are usually inaccurate (most are rayon or viscose), and Amazon's style guide bans the phrasing.",
    fix: "State the actual fiber, e.g. \"rayon made from bamboo\", matching the fabric content label.",
    source: "amazonBullets",
  },
];

/** Well-known brands that new sellers often borrow. Extended per request by the seller's own list. */
export const BUILTIN_PROTECTED_BRANDS = [
  "Apple",
  "iPhone",
  "AirPods",
  "Nike",
  "Adidas",
  "Disney",
  "Marvel",
  "Pokemon",
  "Pokémon",
  "Hello Kitty",
  "Stanley",
  "YETI",
  "Dyson",
  "LEGO",
  "Samsung",
  "Sony",
  "Bose",
  "Hydro Flask",
  "Owala",
];

/** Words that are not counted by the "no word more than twice" title rule. */
export const TITLE_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "for", "with", "of", "to", "in", "on", "by", "at", "from", "&", "x",
]);

export const LIMITS = {
  titleMaxChars: 200,
  titleMaxWordRepeats: 2,
  bulletsMin: 3,
  bulletsMax: 5,
  bulletMinChars: 10,
  bulletMaxChars: 255,
  searchTermsMaxBytes: 250,
} as const;

export const TITLE_FORBIDDEN_CHARS = ["!", "$", "?", "_", "{", "}", "^", "¬", "¦"];

export const source = (id: SourceId) => SOURCES[id];
