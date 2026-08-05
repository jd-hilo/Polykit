// Evidence packet builder.
//
// The analyze_market tool asks a server-side model for a verdict. That model
// only knows what we hand it, and when the decisive facts are missing it tends
// to fill the gap — on the 2026 recession market it invented a yield-curve
// figure and anchored to a generic twelve-month recession base rate instead of
// the contract's actual two-quarter rule.
//
// This builds the other half of the answer: everything verifiable about a
// market, laid out so the *calling* model — Claude or ChatGPT, which has web
// search and is usually stronger than the one we call — can do the judgment
// itself. No LLM runs here, so it is fast, free, and cannot hallucinate.
//
// The design rule: we supply what we can verify and name precisely what still
// needs looking up. We never guess at an outside number.

import type { PolymarketSnapshot } from "./polymarket";

/* ──────────────────────────────────────────────────────────── *
 * Rule hints                                                    *
 *                                                               *
 * Heuristics over the resolution text. These are signposts for  *
 * the model, never a substitute for the verbatim rules, and are *
 * labelled as such in the output.                               *
 * ──────────────────────────────────────────────────────────── */

const SOURCES: [RegExp, string][] = [
  [/\bBEA\b|Bureau of Economic Analysis/i, "BEA (Bureau of Economic Analysis)"],
  [/\bBLS\b|Bureau of Labor Statistics/i, "BLS (Bureau of Labor Statistics)"],
  [/\bNBER\b|National Bureau of Economic Research/i, "NBER"],
  [/\bFOMC\b|Federal Open Market Committee|Federal Reserve|the Fed\b/i, "Federal Reserve / FOMC"],
  [/\bCBO\b|Congressional Budget Office/i, "CBO"],
  [/\bCensus Bureau\b/i, "US Census Bureau"],
  [/\bTreasury\b/i, "US Treasury"],
  [/\bFEC\b|Federal Election Commission/i, "FEC"],
  [/Associated Press|\bAP\b(?! )/i, "Associated Press"],
  [/\bReuters\b/i, "Reuters"],
  [/Supreme Court|SCOTUS/i, "US Supreme Court"],
  [/\bCDC\b|\bWHO\b/i, "CDC / WHO"],
  [/\bNOAA\b|National Hurricane Center/i, "NOAA"],
  [/\bIMF\b|World Bank/i, "IMF / World Bank"],
];

const SERIES: [RegExp, string][] = [
  [/real GDP|gross domestic product|GDP growth/i, "US real GDP (quarterly, SAAR)"],
  [/\bCPI\b|consumer price index/i, "CPI"],
  [/\bPCE\b|personal consumption expenditures/i, "PCE price index"],
  [/unemployment rate/i, "Unemployment rate"],
  [/nonfarm payrolls|jobs report/i, "Nonfarm payrolls"],
  [/federal funds rate|interest rate decision|rate cut|rate hike/i, "Federal funds target rate"],
  [/inflation/i, "Inflation"],
  [/yield curve|treasury yield|2s10s/i, "Treasury yields"],
  [/electoral college|popular vote|certified results/i, "Election results"],
];

const STRUCTURES: [RegExp, string][] = [
  [
    /two consecutive|2 consecutive|consecutive quarters/i,
    "Requires CONSECUTIVE qualifying observations — a single bad print is not enough, and one good print can close a path.",
  ],
  [
    /either of the following|any of the following|whichever occurs first/i,
    "Multiple INDEPENDENT paths to YES — evaluate each separately, then combine.",
  ],
  [
    /all of the following|both of the following/i,
    "Requires ALL listed conditions — the least likely one caps the probability.",
  ],
  [
    /advance estimate|preliminary estimate|first release/i,
    "Resolves on an ADVANCE/first estimate, not the final revision — timing of the release matters as much as the value.",
  ],
  [
    /revis(ed|ion)/i,
    "Revisions can change the answer after the fact — check whether the rules pin a specific vintage.",
  ],
  [
    /announce|declare|publicly state/i,
    "Requires a formal ANNOUNCEMENT by a named body, which can lag the underlying event by months.",
  ],
  [
    /on or before|by the time|no later than/i,
    "Hard DEADLINE — an event that happens too late does not count.",
  ],
];

export type RuleHints = {
  sources: string[];
  series: string[];
  structures: string[];
  quarters: string[];
  dates: string[];
  thresholds: string[];
};

export function extractRuleHints(rules: string | null): RuleHints {
  const empty: RuleHints = {
    sources: [],
    series: [],
    structures: [],
    quarters: [],
    dates: [],
    thresholds: [],
  };
  if (!rules) return empty;

  const uniq = (xs: string[]) => Array.from(new Set(xs));
  const match = (pairs: [RegExp, string][]) =>
    uniq(pairs.filter(([re]) => re.test(rules)).map(([, label]) => label));

  // Q1 2026 / Q4 2025 style windows — these define the observation set.
  const quarters = uniq(rules.match(/Q[1-4]\s*'?\d{2,4}/gi) ?? []);
  // Explicit calendar dates the rules pin.
  const dates = uniq(
    rules.match(
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/gi,
    ) ?? [],
  );
  // Numeric bars the outcome is measured against.
  const thresholds = uniq(
    rules.match(/(?:less than|greater than|at least|below|above|under|over)\s+[-−]?[\d.,]+%?/gi) ?? [],
  ).slice(0, 8);

  return {
    sources: match(SOURCES),
    series: match(SERIES),
    structures: match(STRUCTURES),
    quarters: quarters.slice(0, 12),
    dates: dates.slice(0, 8),
    thresholds,
  };
}

/* ──────────────────────────────────────────────────────────── *
 * Packet                                                        *
 * ──────────────────────────────────────────────────────────── */

function cents(p: number): number {
  return Math.round(p * 100);
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86_400_000);
}

function money(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "unknown";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

/**
 * Render everything verifiable about a market, plus the method the caller
 * should follow. Deterministic: same snapshot in, same packet out.
 */
export function buildEvidencePacket(snap: PolymarketSnapshot): string {
  const yes = cents(snap.yesPrice);
  const no = cents(snap.noPrice);
  const days = daysUntil(snap.endsAt);
  const hints = extractRuleHints(snap.description);

  const out: string[] = [];

  out.push(`# Polykit evidence packet`);
  out.push(
    `Verified Polymarket data plus the method to analyze it. No model has judged this market — that is your job, using the rules and prices below.`,
  );

  /* Market ------------------------------------------------------------- */
  out.push(`\n## 1. Market`);
  out.push(`- **Question:** ${snap.question}`);
  if (snap.eventTitle && snap.eventTitle !== snap.question) {
    out.push(`- **Event:** ${snap.eventTitle}`);
  }
  out.push(`- **Market slug:** \`${snap.slug}\``);
  if (snap.eventSlug) out.push(`- **Event slug:** \`${snap.eventSlug}\``);
  out.push(`- **Live price:** YES ${yes}¢ · NO ${no}¢ (implied P(YES) = ${yes}%)`);
  out.push(`- **Volume:** ${money(snap.volumeUsd)} · **Liquidity:** ${money(snap.liquidityUsd)}`);
  if (snap.endsAt) {
    out.push(
      `- **Resolves:** ${snap.endsAt.slice(0, 10)}${days !== null ? ` (${days} days away)` : ""}`,
    );
  }
  if (snap.liquidityUsd > 0 && snap.liquidityUsd < 10_000) {
    out.push(
      `- ⚠️ **Thin liquidity.** Exiting early will be expensive; treat this as hold-to-resolution or skip it.`,
    );
  }

  /* Rules -------------------------------------------------------------- */
  out.push(`\n## 2. Resolution rules (verbatim, untruncated)`);
  if (snap.description?.trim()) {
    out.push(`> ${snap.description.trim().replace(/\n+/g, "\n> ")}`);
  } else {
    out.push(
      `_Polymarket published no rules text for this market. Do not assume the headline question is the resolution criterion — say the rules are unavailable and lower your confidence accordingly._`,
    );
  }

  /* Hints -------------------------------------------------------------- */
  const anyHints =
    hints.sources.length ||
    hints.series.length ||
    hints.structures.length ||
    hints.quarters.length ||
    hints.dates.length ||
    hints.thresholds.length;

  if (anyHints) {
    out.push(`\n## 3. What the rules appear to hinge on`);
    out.push(`_Detected automatically from the text above. Verify against the rules; they win._`);
    if (hints.series.length) out.push(`- **Measured series:** ${hints.series.join("; ")}`);
    if (hints.sources.length) out.push(`- **Resolution source:** ${hints.sources.join("; ")}`);
    if (hints.quarters.length) {
      out.push(`- **Observation windows named:** ${hints.quarters.join(", ")}`);
    }
    if (hints.dates.length) out.push(`- **Dates named:** ${hints.dates.join(", ")}`);
    if (hints.thresholds.length) out.push(`- **Thresholds named:** ${hints.thresholds.join(", ")}`);
    for (const s of hints.structures) out.push(`- ⚙️ ${s}`);
  }

  /* Siblings ----------------------------------------------------------- */
  if (snap.siblings && snap.siblings.length > 1) {
    out.push(`\n## 4. Sibling markets in this event (${snap.siblings.length})`);
    out.push(`_Same event, different outcomes. The best price is often not the one you were sent._`);
    for (const s of snap.siblings) {
      const bits = [
        `YES ${s.yesCents}¢ / NO ${s.noCents}¢`,
        s.liquidityUsd > 0 ? `liq ${money(s.liquidityUsd)}` : "",
        s.endDate ? `resolves ${s.endDate.slice(0, 10)}` : "",
      ].filter(Boolean);
      out.push(`- **${s.question}** — \`${s.slug}\` · ${bits.join(" · ")}`);
    }
    out.push(
      `\nIf these outcomes are mutually exclusive and exhaustive, their YES prices should sum near 100¢. A sum well above 100¢ means a favourite-longshot premium worth fading; well below means a possible arbitrage.`,
    );
  }

  /* Method ------------------------------------------------------------- */
  const methodNo = snap.siblings && snap.siblings.length > 1 ? 5 : 4;

  out.push(`\n## ${methodNo}. How to answer — lead with the call`);
  out.push(
    `The user wants the verdict first and the reasoning underneath. **Open your reply with a single bolded line in exactly this shape**, filled in with your own numbers:`,
  );
  out.push(
    `\n> **[BUY YES | BUY NO | PASS] · pay [price]¢ · fair [your estimate]¢ · edge [±N]¢ · confidence [low|medium|high] · exit [date or trigger]**`,
  );
  out.push(
    `\nFill every field from your own analysis — the brackets are a template, not a suggestion, and nothing above implies which side is right. YES is ${yes}¢ and NO is ${no}¢ right now; which of those is cheap is exactly what you are working out. When the edge is under ~3¢ or liquidity is thin, the honest line is \`**PASS · [price]¢ is fair · edge <3¢**\`.`,
  );
  out.push(
    `Then, and only then, show the work below it. Never make the reader hunt for the answer at the bottom.`,
  );

  out.push(`\n## ${methodNo + 1}. How to get there`);
  out.push(
    `**Reason in this order — it is not the order you present in. Skipping step 2 is the most common way this analysis goes wrong.**`,
  );
  out.push(
    `1. **Read the rules above and state the mechanical trigger** — which series, which threshold, which window, which body publishes it, and the last date a qualifying observation can land.`,
  );
  out.push(
    `2. **Enumerate the paths to YES and mark each open or closed.** Look up what has ALREADY been published in the window and eliminate every path that can no longer happen. A market whose window is half-resolved is not the question the headline implies. Say how many paths remain.`,
  );
  out.push(
    `3. **Only then reach for a base rate**, and only for the paths still open. Do not anchor to a generic reference class ("recession within 12 months") when the contract measures something narrower ("two specific quarterly prints, both negative, published before a fixed date").`,
  );
  out.push(
    `4. **Estimate P(YES)** by combining the open paths, compare against the ${yes}¢ market price, and state the edge in cents.`,
  );
  out.push(
    `5. **Write the verdict line first**, then support it underneath: the mechanical trigger in one line, which paths are open or closed and why, how you got to fair value, the key risks, and what would change your mind. If the edge is under ~3¢, or liquidity is thin, PASS is the honest answer — say so in the verdict line rather than burying it.`,
  );
  out.push(
    `6. **Say when to get out.** A market whose last path closes on a scheduled release often reprices hard on that date; exiting there can beat holding to resolution for a few extra cents. Name the date or the print that should trigger the exit.`,
  );

  out.push(`\n**Sourcing rules:**`);
  out.push(
    `- Look up the published observations named in step 2 before concluding. If you cannot verify them, say so and lower your confidence — do not assume an unverified path is open.`,
  );
  out.push(
    `- Never state an outside figure (GDP prints, yields, poll numbers) from memory. Fetch it and cite it, or say it is unavailable. A remembered market level is usually stale.`,
  );
  out.push(
    `- The prices above are live from Polymarket's API at the time of this call. Cached pages and search snippets are often stale — prefer these numbers.`,
  );
  out.push(
    `\n_Polykit supplies verified market data and method. It is not financial advice, is not affiliated with Polymarket, and never places trades._`,
  );

  return out.join("\n");
}
