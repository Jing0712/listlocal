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
      messageZh: `标题有 ${len} 个字符，超过 Amazon 规定的 ${LIMITS.titleMaxChars} 个字符上限（部分类目更短）。`,
      fixZh: "删掉重复和次要的词，把最重要的信息放在前 80 个字符。",
      source: source("amazonTitle2025"),
    });
  }
  if (title.trim().length === 0) {
    out.push({
      ruleId: "title-empty",
      severity: "error",
      field: "title",
      match: "",
      messageZh: "标题为空。",
      fixZh: "补上标题。",
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
      messageZh: `标题里出现了 Amazon 禁止的特殊字符：${badChars.join(" ")}（品牌名本身包含的除外）。`,
      fixZh: "删除这些字符，需要分隔时可以用逗号、竖线或短横线。",
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
        messageZh: `"${word}" 在标题里出现了 ${n} 次。Amazon 要求同一个词（含单复数）最多出现 2 次。`,
        fixZh: "合并重复的词，把多出来的关键词移到后台搜索词里。",
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
      messageZh: `只有 ${bullets.length} 条五点描述，至少需要 ${LIMITS.bulletsMin} 条。`,
      fixZh: "补充材质、尺寸、使用场景、包装清单等信息。",
      source: source("amazonBullets"),
    });
  }
  if (bullets.length > LIMITS.bulletsMax) {
    out.push({
      ruleId: "bullets-count",
      severity: "warning",
      field: "bullets",
      match: `${bullets.length} bullets`,
      messageZh: `有 ${bullets.length} 条五点描述，第三方卖家最多显示 ${LIMITS.bulletsMax} 条。`,
      fixZh: "合并或删除多余的条目。",
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
        messageZh: `第 ${i + 1} 条太短（${len} 个字符）。`,
        fixZh: "写成完整的卖点，至少一句话。",
        source: source("amazonBullets"),
      });
    }
    if (len > LIMITS.bulletMaxChars) {
      out.push({
        ruleId: "bullet-too-long",
        severity: "warning",
        field,
        match: `${len} chars`,
        messageZh: `第 ${i + 1} 条有 ${len} 个字符，建议控制在 ${LIMITS.bulletMaxChars} 个以内，移动端才显示得完整。`,
        fixZh: "删掉修饰语，保留一个核心卖点。",
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
        messageZh: `第 ${i + 1} 条含有表情符号或特殊符号，Amazon 不允许。`,
        fixZh: "删掉符号，用文字表达。",
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
        messageZh: `第 ${i + 1} 条含有占位文字 "${placeholder[0]}"。`,
        fixZh: "换成真实内容。",
        source: source("amazonBullets"),
      });
    }
    if (/(?:\b[A-Z]{2,}\b[\s,;:&-]+){3,}/.test(b + " ")) {
      out.push({
        ruleId: "bullet-all-caps",
        severity: "warning",
        field,
        match: b.slice(0, 40),
        messageZh: `第 ${i + 1} 条有连续的全大写单词，Amazon 风格指南不建议全大写。`,
        fixZh: "开头的小标题用首字母大写即可，例如 \"Durable Material:\"。",
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
        messageZh: `第 ${i + 1} 条和第 ${seen.get(norm)! + 1} 条重复。`,
        fixZh: "每条写一个不同的卖点。",
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
      messageZh: `后台搜索词有 ${bytes} 字节，超过 ${LIMITS.searchTermsMaxBytes} 字节上限。超出时 Amazon 可能整段都不索引。`,
      fixZh: "删除重复词、标点和标题里已经有的词。",
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
      messageZh: "后台搜索词里有重复的词，浪费字节。",
      fixZh: "每个词只写一次。",
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
      messageZh: `后台搜索词里有 ${overlap.length} 个词已经在标题中出现，不会带来额外曝光。`,
      fixZh: "换成同义词、使用场景或常见拼写变体。",
      source: source("amazonSearchTerms"),
    });
  }
  if (ctx.ownBrand && phraseRegex(escapeRegex(ctx.ownBrand)).test(terms)) {
    out.push({
      ruleId: "search-terms-own-brand",
      severity: "info",
      field: "searchTerms",
      match: ctx.ownBrand,
      messageZh: "后台搜索词里写了自己的品牌名，品牌已经被索引，这样浪费字节。",
      fixZh: "删掉品牌名。",
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
        messageZh: rule.messageZh,
        fixZh: rule.fixZh,
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
      messageZh: "listing 里不能出现网址、邮箱、电话等联系方式。",
      fixZh: "删除联系方式，买家沟通请走 Amazon 站内信。",
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
      messageZh: "美国站 listing 里还有中文没有翻译。",
      fixZh: "翻译成英文或删除。",
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
      messageZh:
        f.kind === "searchTerms"
          ? `后台搜索词里出现了其他品牌 "${m[0]}"，可能导致 listing 被下架。`
          : `出现了其他品牌 "${m[0]}"。只有在如实说明兼容性（例如 "compatible with iPhone 15"）时才可能被允许，否则有侵权风险。`,
      fixZh: "删掉品牌名；如果是兼容配件，只写一次 \"compatible with ...\"，且不能出现在标题开头。",
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
        messageZh: `数字 ${bad.join(", ")} 在你提供的产品信息里找不到（也不是单位换算的结果），可能是 AI 编造的参数。`,
        fixZh: "请核对实物参数；如果不确定就删掉，夸大的参数会招来差评和退货。",
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
