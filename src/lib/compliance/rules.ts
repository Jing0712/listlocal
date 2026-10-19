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
  messageZh: string;
  fixZh: string;
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
    messageZh: "疑似医疗或疾病宣称。在美国，宣称能治疗、预防疾病的产品会被当作药品监管，Amazon 会下架这类 listing。",
    fixZh: "改成描述产品本身的功能和使用感受，例如把 \"relieves back pain\" 改成 \"ergonomic support for long hours of sitting\"。",
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
    messageZh: "抗菌、杀菌、消毒类宣称在美国属于农药宣称（需要 EPA 注册），Amazon 会按农药政策拦截。",
    fixZh: "删除抗菌、消毒的说法；如果材料本身确实经过处理，只能如实描述处理是为了保护产品本身，并先确认是否符合 EPA 的 treated article 豁免。",
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
    messageZh: "listing 文案里不允许写退款或保证类承诺。",
    fixZh: "删掉这句话；售后政策请写在 Amazon 指定的位置，而不是标题和五点描述里。",
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
    messageZh: "促销用语或主观排名（例如 best seller、#1、free shipping）不能出现在标题和后台关键词里，五点描述里也不建议写。",
    fixZh: "换成可以证实的具体卖点，例如材质、尺寸、适用场景。",
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
    messageZh: "笼统的环保宣称（例如 eco-friendly、non-toxic）在 FTC 指南下需要具体限定并有证据支持，Amazon 也会限制这类词。",
    fixZh: "改成具体、可证实的说法，例如 \"made with 30% recycled PET\"，并保留证明材料。",
    source: "ftcGreenGuides",
  },
  {
    id: "bamboo-soy-claim",
    patterns: ["made (?:from|of) bamboo", "bamboo (?:fabric|fiber|viscose)", "made (?:from|of) soy"],
    severity: "warning",
    messageZh: "\"made from bamboo\" 这类纺织品宣称经常不准确（多数其实是 rayon/viscose），Amazon 风格指南把它列为禁用表述。",
    fixZh: "按实际成分写，例如 \"rayon made from bamboo\"，并确认面料成分标签一致。",
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
