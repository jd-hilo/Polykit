// Shared types for the AI analyzer feature.
// Matches the polifly_clone_brief.md analyze-market response schema.

export type AnalyzerPick = "Yes" | "No";
export type AnalyzerAction = "BUY" | "SELL" | "PASS";
export type AnalyzerTier = "high" | "medium" | "low";

export type AnalyzerSource = {
  title: string;
  url: string;
  domain: string;
};

export type SiblingEstimate = {
  slug: string;
  question: string;
  market_price_cents: number;   // current YES cents (0..100)
  fair_yes_cents: number;       // AI-estimated fair YES cents (0..100)
  edge_cents: number;           // signed, from YES perspective (fair - market)
  side: AnalyzerPick;           // which side has positive edge
};

export type RecommendedSibling = {
  slug: string;
  question: string;
  side: AnalyzerPick;
  market_price_cents: number;   // price of the RECOMMENDED side (YES or NO)
  fair_price_cents: number;     // fair value of the RECOMMENDED side
  edge_cents: number;           // signed on the recommended side (always >=0 for a real pick)
};

export type AnalyzerResult = {
  pick: AnalyzerPick;
  action: AnalyzerAction;
  current_price: number;     // 0..100 int (cents) — YES price of the recommended sub-market
  edge: number;              // percentage points, signed (YES perspective)
  confidence: number;        // 0..100 int
  tier: AnalyzerTier;        // derived from `confidence`
  reasons: string[];         // exactly 3 strings, >= 40 chars each
  key_risks: string[];       // 1-3 strings
  // market_slug = the RECOMMENDED sub-market's slug (so UI can show "bet this one").
  // event_slug  = the parent event slug (so "View on Polymarket" opens the event page
  //               showing all siblings).
  // market_question = the RECOMMENDED sub-market's question.
  market_slug: string | null;
  event_slug: string | null;
  event_title: string | null;
  market_question: string;
  sources: AnalyzerSource[]; // may be empty for now
  // Multi-market support. `siblings` is always present; when the event has only
  // one real sub-market it's a 1-element array mirroring the single analysis.
  siblings: SiblingEstimate[];
  recommended_sibling: RecommendedSibling | null;
};

export type AnalyzerResponse =
  | { ok: true; result: AnalyzerResult }
  | { ok: false; error: string };

/**
 * Bucket a 0-100 confidence number into a display tier.
 *  >= 80   → high
 *  65-79   → medium
 *  < 65    → low
 */
export function confidenceTier(n: number): AnalyzerTier {
  const c = Number.isFinite(n) ? n : 0;
  if (c >= 80) return "high";
  if (c >= 65) return "medium";
  return "low";
}
