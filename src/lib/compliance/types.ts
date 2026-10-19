import type { Source } from "./sources";

export type Listing = {
  title: string;
  bullets: string[];
  description: string;
  searchTerms: string;
};

export type Severity = "error" | "warning" | "info";

/** One deterministic rule hit. Every issue carries the public source it is based on. */
export type Issue = {
  ruleId: string;
  severity: Severity;
  /** e.g. "title", "bullets[2]", "description", "searchTerms" */
  field: string;
  /** The offending text (or a measured value such as "214 chars"). */
  match: string;
  messageZh: string;
  fixZh: string;
  source: Source | null;
};

export type CheckContext = {
  /** The seller's own brand: allowed to appear, exempt from special-char rule. */
  ownBrand?: string;
  /** Competitor / third-party brands the seller must not use. */
  avoidBrands?: string[];
  /**
   * Raw text the seller supplied. When present, numbers in the listing that
   * never appear in this text are flagged as possibly invented specs.
   */
  sourceText?: string;
};
