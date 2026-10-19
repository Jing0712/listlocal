import {
  BUILTIN_PROTECTED_BRANDS,
  LIMITS,
  PHRASE_RULES,
  TITLE_FORBIDDEN_CHARS,
  TITLE_STOPWORDS,
  source,
  type FieldKind,
} from "./rules";
import type { CheckContext, Issue, Listing, Severity } from "./types";

/**
 * Deterministic compliance check. Pure function: same listing in, same issues out.
 * No LLM is involved here, so every issue is reproducible and cites a source.
 */
export function checkListing(listing: Listing, ctx: CheckContext = {}): Issue[] {
  const issues: Issue[] = [];
  const fields = fieldEntries(listing);

  checkTitle(listing.title, ctx, issues);
  checkBullets(listing.bullets, issues);
  checkSearchTerms(listing.searchTerms, listing.title, ctx, issues);

  for (const f of fields) {
    checkPhraseRules(f, issues);
    checkContactInfo(f, issues);
    checkUntranslated(f, issues);
    checkBrands(f, ctx, issues);
  }

  if (ctx.sourceText) checkUnsupportedNumbers(fields, ctx.sourceText, issues);

  return dedupe(issues);
}

export function summarize(issues: Issue[]) {
  return {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    infos: issues.filter((i) => i.severity === "info").length,
  };
}

// ---------------------------------------------------------------------------

type FieldEntry = { name: string; kind: FieldKind; text: string };

function fieldEntries(l: Listing): FieldEntry[] {
  return [
    { name: "title", kind: "title", text: l.title },
    ...l.bullets.map((b, i) => ({ name: `bullets[${i}]`, kind: "bullets" as const, text: b })),
    { name: "description", kind: "description", text: l.description },
    { name: "searchTerms", kind: "searchTerms", text: l.searchTerms },
  ];
}

/** Regex with boundaries that also work around symbols like "#1". */
export function phraseRegex(pattern: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, "giu");
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

function checkTitle(title: string, ctx: CheckContext, out: Issue[]) {
  const len = [...title].length;
  if (len > LIMITS.titleMaxChars) {
    out.push({
      ruleId: "title-length",
      severity: "error",
      field: "title",
      match: `${len} chars`,
      message: `The title is ${len} characters. Amazon allows at most ${LIMITS.titleMaxChars} (some categories allow fewer).`,
      fix: "Cut repeated and secondary words, and keep the key facts in the first 80 characters.",
      source: source("amazonTitle2025"),
    });
  }
  if (title.trim().length === 0) {
    out.push({
      ruleId: "title-empty",
      severity: "error",
      field: "title",
      match: "",
      message: "The title is empty.",
      fix: "Add a title.",
      source: null,
    });
  }

  const withoutBrand = ctx.ownBrand ? title.split(ctx.ownBrand).join(" ") : title;
  const badChars = TITLE_FORBIDDEN_CHARS.filter((c) => withoutBrand.includes(c));
  if (badChars.length) {
    out.push({
      ruleId: "title-special-chars",
      severity: "error",
      field: "title",
      match: badChars.join(" "),
      message: `The title uses characters Amazon does not allow: ${badChars.join(" ")} (unless they are part of your brand name).`,
      fix: "Remove them. Use commas, pipes or hyphens to separate phrases.",
      source: source("amazonTitle2025"),
    });
  }

  const brandWords = new Set((ctx.ownBrand ?? "").toLowerCase().split(/\s+/).filter(Boolean));
  const counts = new Map<string, number>();
  for (const raw of withoutBrand.toLowerCase().split(/[^\p{L}\p{N}'-]+/u)) {
    const w = raw.replace(/^['-]+|['-]+$/g, "");
    if (!w || TITLE_STOPWORDS.has(w) || brandWords.has(w) || /^\d+$/.test(w)) continue;
    const stem = w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
    counts.set(stem, (counts.get(stem) ?? 0) + 1);
  }
  for (const [word, n] of counts) {
    if (n > LIMITS.titleMaxWordRepeats) {
      out.push({
        ruleId: "title-word-repeat",
        severity: "error",
        field: "title",
        match: `${word} ×${n}`,
        message: `"${word}" appears ${n} times in the title. Amazon allows any word (including its plural) at most twice.`,
        fix: "Merge the repeats and move extra keywords to the backend search terms.",
        source: source("amazonTitle2025"),
      });
    }
  }
}

function checkBullets(bullets: string[], out: Issue[]) {
  if (bullets.length < LIMITS.bulletsMin) {
    out.push({
      ruleId: "bullets-count",
      severity: "error",
      field: "bullets",
      match: `${bullets.length} bullets`,
      message: `Only ${bullets.length} bullet points. Amazon expects at least ${LIMITS.bulletsMin}.`,
      fix: "Add bullets on materials, size, use cases or what is in the box.",
      source: source("amazonBullets"),
    });
  }
  if (bullets.length > LIMITS.bulletsMax) {
    out.push({
      ruleId: "bullets-count",
      severity: "warning",
      field: "bullets",
      match: `${bullets.length} bullets`,
      message: `${bullets.length} bullet points. Third-party sellers get at most ${LIMITS.bulletsMax} displayed.`,
      fix: "Merge or remove the extra bullets.",
      source: source("amazonBullets"),
    });
  }

  const seen = new Map<string, number>();
  bullets.forEach((b, i) => {
    const field = `bullets[${i}]`;
    const len = [...b].length;
    if (len < LIMITS.bulletMinChars) {
      out.push({
        ruleId: "bullet-too-short",
        severity: "error",
        field,
        match: `${len} chars`,
        message: `Bullet ${i + 1} is too short (${len} characters).`,
        fix: "Write a full selling point of at least one sentence.",
        source: source("amazonBullets"),
      });
    }
    if (len > LIMITS.bulletMaxChars) {
      out.push({
        ruleId: "bullet-too-long",
        severity: "warning",
        field,
        match: `${len} chars`,
        message: `Bullet ${i + 1} is ${len} characters. Keep it under ${LIMITS.bulletMaxChars} so it shows in full on mobile.`,
        fix: "Cut the filler and keep one core benefit.",
        source: source("amazonBullets"),
      });
    }
    const emoji = b.match(/\p{Extended_Pictographic}/u);
    const symbol = b.match(/[™®©€£¥~✓✔✗✘★☆•►▶]/u);
    if (emoji || symbol) {
      out.push({
        ruleId: "bullet-special-chars",
        severity: "error",
        field,
        match: (emoji ?? symbol)![0],
        message: `Bullet ${i + 1} contains an emoji or symbol, which Amazon does not allow.`,
        fix: "Remove the symbol and say it in words.",
        source: source("amazonBullets"),
      });
    }
    const placeholder = b.match(phraseRegex("N/A|TBD|COPY PENDING|ASIN"));
    if (placeholder) {
      out.push({
        ruleId: "bullet-placeholder",
        severity: "error",
        field,
        match: placeholder[0],
        message: `Bullet ${i + 1} contains placeholder text "${placeholder[0]}".`,
        fix: "Replace it with real product information.",
        source: source("amazonBullets"),
      });
    }
    if (/(?:\b[A-Z]{2,}\b[\s,;:&-]+){3,}/.test(b + " ")) {
      out.push({
        ruleId: "bullet-all-caps",
        severity: "warning",
        field,
        match: b.slice(0, 40),
        message: `Bullet ${i + 1} has a run of ALL CAPS words, which Amazon's style guide discourages.`,
        fix: "Use Title Case for the bullet header, e.g. \"Durable Material:\".",
        source: source("amazonBullets"),
      });
    }
    const norm = b.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (norm && seen.has(norm)) {
      out.push({
        ruleId: "bullet-duplicate",
        severity: "warning",
        field,
        match: b.slice(0, 40),
        message: `Bullet ${i + 1} repeats bullet ${seen.get(norm)! + 1}.`,
        fix: "Give each bullet a different selling point.",
        source: source("amazonBullets"),
      });
    } else if (norm) {
      seen.set(norm, i);
    }
  });
}

function checkSearchTerms(terms: string, title: string, ctx: CheckContext, out: Issue[]) {
  const bytes = utf8Bytes(terms);
  if (bytes > LIMITS.searchTermsMaxBytes) {
    out.push({
      ruleId: "search-terms-bytes",
      severity: "error",
      field: "searchTerms",
      match: `${bytes} bytes`,
      message: `Search terms are ${bytes} bytes, over the ${LIMITS.searchTermsMaxBytes}-byte limit. Amazon may ignore all of them when the limit is exceeded.`,
      fix: "Remove repeated words, punctuation and words already in the title.",
      source: source("amazonSearchTerms"),
    });
  }
  const words = terms.toLowerCase().split(/[\s,;]+/).filter(Boolean);
  const dupes = [...new Set(words.filter((w, i) => words.indexOf(w) !== i))];
  if (dupes.length) {
    out.push({
      ruleId: "search-terms-repeat",
      severity: "info",
      field: "searchTerms",
      match: dupes.slice(0, 5).join(", "),
      message: "Some search terms repeat, which wastes bytes.",
      fix: "List each word once.",
      source: source("amazonSearchTerms"),
    });
  }
  const titleWords = new Set(title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2));
  const overlap = [...new Set(words.filter((w) => titleWords.has(w)))];
  if (overlap.length >= 3) {
    out.push({
      ruleId: "search-terms-title-overlap",
      severity: "info",
      field: "searchTerms",
      match: overlap.slice(0, 6).join(", "),
      message: `${overlap.length} search terms already appear in the title, so they add no extra reach.`,
      fix: "Use synonyms, use cases or common alternate spellings instead.",
      source: source("amazonSearchTerms"),
    });
  }
  if (ctx.ownBrand && phraseRegex(escapeRegex(ctx.ownBrand)).test(terms)) {
    out.push({
      ruleId: "search-terms-own-brand",
      severity: "info",
      field: "searchTerms",
      match: ctx.ownBrand,
      message: "Your own brand is in the search terms. Amazon already indexes it, so it wastes bytes.",
      fix: "Remove the brand name.",
      source: source("amazonSearchTerms"),
    });
  }
}

function checkPhraseRules(f: FieldEntry, out: Issue[]) {
  for (const rule of PHRASE_RULES) {
    for (const p of rule.patterns) {
      const m = f.text.match(phraseRegex(p));
      if (!m) continue;
      const severity: Severity = rule.severityByField?.[f.kind] ?? rule.severity;
      out.push({
        ruleId: rule.id,
        severity,
        field: f.name,
        match: m[0],
        message: rule.message,
        fix: rule.fix,
        source: source(rule.source),
      });
    }
  }
}

function checkContactInfo(f: FieldEntry, out: Issue[]) {
  const phone = [...f.text.matchAll(/\+?\(?\d[\d\s().-]{8,}\d/g)].find(
    (p) => p[0].replace(/\D/g, "").length >= 10 && !/\d\.\d/.test(p[0]),
  );
  const m =
    f.text.match(/[\w.+-]+@[\w-]+\.[\w.]+/) ??
    f.text.match(/https?:\/\/\S+|www\.\S+|\b[\w-]+\.(?:com|net|org|cn|shop|store)\b/i) ??
    phone ??
    null;
  if (m) {
    out.push({
      ruleId: "contact-info",
      severity: "error",
      field: f.name,
      match: m[0],
      message: "Listings cannot contain URLs, email addresses or phone numbers.",
      fix: "Remove it. Buyers contact you through Amazon messaging.",
      source: source("amazonBullets"),
    });
  }
}

function checkUntranslated(f: FieldEntry, out: Issue[]) {
  const m = f.text.match(/[\p{Script=Han}]+/u);
  if (m) {
    out.push({
      ruleId: "untranslated-text",
      severity: "error",
      field: f.name,
      match: m[0],
      message: "There is untranslated Chinese text in a US listing.",
      fix: "Translate it into English or remove it.",
      source: null,
    });
  }
}

function checkBrands(f: FieldEntry, ctx: CheckContext, out: Issue[]) {
  const own = (ctx.ownBrand ?? "").toLowerCase();
  const brands = [...new Set([...(ctx.avoidBrands ?? []), ...BUILTIN_PROTECTED_BRANDS])]
    .map((b) => b.trim())
    .filter((b) => b && b.toLowerCase() !== own);
  for (const b of brands) {
    const m = f.text.match(phraseRegex(escapeRegex(b)));
    if (!m) continue;
    const userListed = (ctx.avoidBrands ?? []).some((x) => x.trim().toLowerCase() === b.toLowerCase());
    out.push({
      ruleId: "third-party-brand",
      severity: f.kind === "searchTerms" || userListed ? "error" : "warning",
      field: f.name,
      match: m[0],
      message:
        f.kind === "searchTerms"
          ? `Another company's brand "${m[0]}" is in your search terms. This can get the listing suppressed.`
          : `Another company's brand "${m[0]}" appears. It is only acceptable as an honest compatibility statement (e.g. "compatible with iPhone 15"); otherwise it is an IP risk.`,
      fix: "Remove it. For accessories, say \"compatible with ...\" once, and never at the start of the title.",
      source: f.kind === "searchTerms" ? source("amazonSearchTerms") : null,
    });
  }
}

/**
 * Grounding check: every number in the listing should come from the seller's
 * input, either verbatim or as a unit conversion of an input number.
 * Catches the model inventing specs such as "5000mAh" or "IPX7".
 */
export function checkUnsupportedNumbers(fields: FieldEntry[], sourceText: string, out: Issue[]) {
  const inputNums = extractNumbers(sourceText);
  const allowed = new Set<number>(inputNums);
  const factors = [2.54, 1 / 2.54, 25.4, 1 / 25.4, 2.20462, 1 / 2.20462, 28.3495, 1 / 28.3495, 29.5735, 1 / 29.5735, 3.78541, 1 / 3.78541, 0.453592, 1 / 0.453592, 1000, 0.001, 0.0393701, 12, 1 / 12];
  const isSupported = (n: number) => {
    if (n <= 10 && Number.isInteger(n)) return true; // small counts ("2 pack", "5 colors") are too noisy to police
    if (allowed.has(n)) return true;
    for (const x of inputNums) {
      for (const f of factors) {
        const c = x * f;
        // Converted values are usually rounded to 1 decimal, or to a whole number for small values.
        if (Math.abs(c - n) <= Math.max(0.06, Math.abs(c) * 0.006)) return true;
        if (Number.isInteger(n) && c < 100 && Math.round(c) === n) return true;
      }
      // Fahrenheit from Celsius and back
      if (Math.abs(x * 1.8 + 32 - n) <= 1 || Math.abs((x - 32) / 1.8 - n) <= 1) return true;
    }
    return false;
  };

  for (const f of fields) {
    const bad = [...new Set(extractNumbers(f.text))].filter((n) => !isSupported(n));
    if (bad.length) {
      out.push({
        ruleId: "unsupported-number",
        severity: "warning",
        field: f.name,
        match: bad.join(", "),
        message: `${bad.join(", ")} does not appear in your product info and is not a unit conversion of it. The AI may have invented this spec.`,
        fix: "Check it against the real product. If unsure, remove it: overstated specs lead to returns and bad reviews.",
        source: null,
      });
    }
  }
}

export function extractNumbers(text: string): number[] {
  const nums: number[] = [];
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?/g)) {
    const raw = m[0];
    // "1,000" is a thousands separator; "1,5" is a European decimal.
    const v = /^\d{1,3}(?:,\d{3})+$/.test(raw) ? Number(raw.replace(/,/g, "")) : Number(raw.replace(",", "."));
    if (Number.isFinite(v)) nums.push(v);
  }
  return nums;
}

function dedupe(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.ruleId}|${i.field}|${i.match.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
