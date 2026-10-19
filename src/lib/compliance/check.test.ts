import { describe, expect, it } from "vitest";
import { checkListing, extractNumbers, utf8Bytes } from "./check";
import type { Listing } from "./types";

const clean: Listing = {
  title: "Trailmate Collapsible Silicone Water Cup, 16.9 oz (500 ml) Food-Grade Travel Cup with Carabiner for Camping and Hiking",
  bullets: [
    "Packs Flat: Folds down to about 1.2 inches (3 cm) so it slips into a pocket or hip belt",
    "Food-Grade Silicone: Holds hot or cold drinks and handles temperatures from -40°F to 392°F",
    "Clip It Anywhere: The included carabiner attaches the cup to a backpack strap or belt loop",
    "Lightweight: Weighs about 3 ounces (85 g), so it adds almost nothing to your pack",
    "Three Colors: Available in blue, green and gray to match your gear",
  ],
  description: "A cup that disappears when you don't need it.",
  searchTerms: "foldable mug portable backpacking drinkware outdoor tumbler",
};
const source = "硅胶折叠水杯 容量 500ml；展开高度 11cm，折叠后 3cm；重量 85g；耐温 -40°C 到 200°C";
const rules = (l: Listing, ctx = {}) => checkListing(l, ctx).map((i) => i.ruleId);

describe("checkListing", () => {
  it("passes a clean listing with no errors", () => {
    const issues = checkListing(clean, { ownBrand: "Trailmate", sourceText: source });
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("accepts unit conversions of input numbers", () => {
    const issues = checkListing(clean, { ownBrand: "Trailmate", sourceText: source });
    expect(issues.find((i) => i.ruleId === "unsupported-number")).toBeUndefined();
  });

  it("flags invented numbers", () => {
    const l = { ...clean, bullets: [...clean.bullets.slice(0, 4), "Big Battery: 5000mAh power bank built in"] };
    const issue = checkListing(l, { sourceText: source }).find((i) => i.ruleId === "unsupported-number");
    expect(issue?.match).toContain("5000");
  });

  it("flags title over 200 chars", () => {
    expect(rules({ ...clean, title: "Cup ".repeat(30) + "x".repeat(100) })).toContain("title-length");
  });

  it("flags forbidden title characters but not inside the brand", () => {
    expect(rules({ ...clean, title: "Great Cup! For Camping" })).toContain("title-special-chars");
    expect(rules({ ...clean, title: "Yahoo! Cup for Camping" }, { ownBrand: "Yahoo!" })).not.toContain("title-special-chars");
  });

  it("flags a word used more than twice, counting plurals", () => {
    expect(rules({ ...clean, title: "Cup Cups Travel Cup for Camping" })).toContain("title-word-repeat");
    expect(rules({ ...clean, title: "Cup for the Camping and the Hiking and the Road" })).not.toContain("title-word-repeat");
  });

  it("flags medical and pesticide claims", () => {
    const l = { ...clean, bullets: [...clean.bullets.slice(0, 4), "Antibacterial silicone that relieves pain and heals mouth ulcers"] };
    const ids = rules(l);
    expect(ids).toContain("pesticide-claim");
    expect(ids).toContain("medical-claim");
  });

  it("does not flag look-alike words", () => {
    // "secures" contains "cure", "treat yourself" is not a disease claim
    const l = { ...clean, description: "The lid secures tightly. Treat yourself on the trail." };
    expect(rules(l)).not.toContain("medical-claim");
  });

  it("makes promotional words an error in the title, a warning in bullets", () => {
    const t = checkListing({ ...clean, title: "Best Seller Camping Cup" }).find((i) => i.ruleId === "promotional-language");
    expect(t?.severity).toBe("error");
    const b = checkListing({ ...clean, bullets: [...clean.bullets.slice(0, 4), "Our #1 cup for hikers and campers"] }).find(
      (i) => i.ruleId === "promotional-language",
    );
    expect(b?.severity).toBe("warning");
  });

  it("flags third-party brands, strictest in search terms", () => {
    const issues = checkListing({ ...clean, searchTerms: "stanley cup dupe" });
    const hit = issues.find((i) => i.ruleId === "third-party-brand");
    expect(hit?.severity).toBe("error");
  });

  it("does not flag the seller's own brand as third-party", () => {
    expect(rules({ ...clean, title: "Stanley Camping Cup" }, { ownBrand: "Stanley" })).not.toContain("third-party-brand");
  });

  it("counts search terms in UTF-8 bytes", () => {
    expect(utf8Bytes("é")).toBe(2);
    expect(rules({ ...clean, searchTerms: "é".repeat(126) })).toContain("search-terms-bytes");
    expect(rules({ ...clean, searchTerms: "a".repeat(250) })).not.toContain("search-terms-bytes");
  });

  it("flags contact info but not dimensions", () => {
    expect(rules({ ...clean, description: "Email us at help@shop.com" })).toContain("contact-info");
    expect(rules({ ...clean, description: "Call +1 (626) 555-0199 today" })).toContain("contact-info");
    expect(rules({ ...clean, description: "Measures 10.5 x 12.5 x 3.2 inches" })).not.toContain("contact-info");
  });

  it("flags untranslated Chinese, emojis and placeholders", () => {
    const ids = rules({ ...clean, title: "Cup 水杯", bullets: [...clean.bullets.slice(0, 3), "Great cup 👍 for travel", "Material: TBD for now"] });
    expect(ids).toEqual(expect.arrayContaining(["untranslated-text", "bullet-special-chars", "bullet-placeholder"]));
  });

  it("requires at least three bullets", () => {
    expect(rules({ ...clean, bullets: clean.bullets.slice(0, 2) })).toContain("bullets-count");
  });
});

describe("extractNumbers", () => {
  it("handles thousands separators and decimals", () => {
    expect(extractNumbers("1,000 pcs, 1,5 kg, 16.9 oz")).toEqual([1000, 1.5, 16.9]);
  });
});
