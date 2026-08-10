// Shared AI analyzer pipeline — used by /api/analyze and MCP analyze_market.

import OpenAI from "openai";
import {
  confidenceTier,
  type AnalyzerAction,
  type AnalyzerPick,
  type AnalyzerResponse,
  type AnalyzerResult,
  type RecommendedSibling,
  type SiblingEstimate,
} from "@/lib/analyzer";
import {
  resolveBestMarket,
  resolvePolymarket,
  siblingsToContext,
  slugFromUrl,
  snapshotToContext,
  type PolymarketSibling,
  type PolymarketSnapshot,
  type VisionSignals,
} from "@/lib/polymarket";

export type AnalyzeEffort = "low" | "medium" | "high";

export type AnalyzeInput = {
  slug?: string | null;
  url?: string | null;
  dataUrl?: string | null;
  context?: string | null;
  reasoning_effort?: AnalyzeEffort;
};

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

const VISION_SYSTEM =
  "Extract prediction-market data from the screenshot as JSON. " +
  "Return ONLY this shape: {question, platform, slug_guess, yes_price, no_price, volume_usd, ends_at, notes, visible_yes_cents, visible_no_cents, visible_volume_usd, visible_end_date, visible_outcomes, keywords}. " +
  "`question`: Extract the FULL verbatim market question — do NOT truncate or paraphrase. If the full question is not visible, extract as much as you can read. " +
  "`platform` is e.g. Polymarket or Kalshi. " +
  "`slug_guess`: ONLY provide if you can see the actual URL path in the screenshot (e.g. from the browser address bar or a visible link). If you cannot see the URL, return null — a wrong slug guess is worse than no guess because it will be tried first and can cause a mismatch. " +
  "`yes_price` / `no_price` (aliases: visible_yes_cents / visible_no_cents) are YES/NO price in cents (0-100) if shown. " +
  "`volume_usd` / `visible_volume_usd` is total USD volume if shown (parse \"$1.2M\" as 1200000). " +
  "`ends_at` / `visible_end_date` is the resolution date ISO-8601 if visible (\"Ends Jun 30, 2026\" → \"2026-06-30\"). " +
  "`visible_outcomes` is an array of sub-market names, candidate names, or option labels visible on the page (e.g. [\"Trump\", \"Vance\", \"Newsom\"] or [\"Jun 30\", \"Dec 31\"]); empty array if it's a single YES/NO market. " +
  "`keywords`: Extract 3-8 of the MOST DISTINCTIVE entities from the question — prioritize: country names, politician names, company names, specific dates, dollar amounts, percentage thresholds. Do NOT include stopwords or generic verbs. Examples: [\"Iran\", \"US\", \"peace deal\", \"April 2026\"] or [\"Trump\", \"executive order\", \"tariffs\", \"Canada\"]. " +
  "Use null for scalars and [] for arrays when a field is not legible or present.";

const ANALYZER_SYSTEM = `You are a world-class prediction-market analyst with a proven track record of calibrated forecasting.

METHOD — follow strictly, in this order:
1. READ THE RESOLUTION RULES FIRST. They are supplied verbatim in the user prompt. Identify the exact mechanical trigger: which measured series, which thresholds, which windows, which publishing body, and the last date a qualifying print can land.
2. ENUMERATE THE LIVE PATHS. Given data that has ALREADY been published, list every remaining path to YES and mark each one open or closed. A path is closed when a required observation has already come in the wrong direction and cannot be revised in time. State how many paths remain. This step dominates — a market whose window is half-resolved is NOT the same question as the headline suggests.
3. ONLY THEN consider base rates from reference classes, and only for paths still open. Never anchor to a generic reference class ("recession within 12 months", "incumbent re-election rate") when the contract measures something narrower ("two specific quarterly prints, both negative, both published before a fixed date"). Choosing the wrong reference class is the single most common way this analysis goes wrong.
4. Weight the most recent primary-source evidence: polls, filings, exchange data, court dockets, Reuters/AP/Bloomberg coverage. Primary > secondary > tertiary.
5. Produce a calibrated probability for YES between 0 and 1. The current market price is given — compute edge = (yourProbability - marketYesProbability) * 100 in percentage points.
6. If |edge| < 3pts OR liquidity is too thin OR the market is already efficient: return action "PASS" with edge near 0.
7. If edge is positive and meaningful: pick "Yes", action "BUY".
8. If edge is negative and meaningful (your probability < market): pick "No", action "BUY" the No side (the user buys the mispriced side).
9. Use action "SELL" only when advising to close an existing position you have strong reason to believe is mispriced against the holder.

EVIDENCE DISCIPLINE — this overrides tone:
- You may state an external figure (yield spreads, GDP prints, poll numbers, filings, prices) ONLY if it appears in the supplied context or search results. If it is not there, you do not know it.
- Never estimate, recall, or reconstruct such a figure from memory. A remembered market level is almost always stale or wrong, and a fabricated one poisons the whole analysis.
- When a figure you want is unavailable, say what is missing and what it would change, then lower "confidence" accordingly. "The 2s10s spread is not in the supplied context" is a correct and useful sentence; inventing a number is not.
- Prefer citing the resolution rules and already-published observations, which are supplied and verifiable, over outside macro colour.

MULTI-MARKET EVENTS:
Many Polymarket events contain several sibling sub-markets (e.g. one YES/NO market per candidate, or per deadline window). When "sibling_context" is provided in the user prompt, you MUST:
  - Produce a fair-value YES estimate (integer 0-100 cents) for EACH listed sibling.
  - Populate "sibling_estimates" with one entry per sibling using its exact slug.
  - Pick the sibling with the largest absolute edge vs its market YES price as "recommended_sibling_slug", and let your top-level pick/action/current_price/edge/reasons/key_risks all refer to THAT specific sibling — not the event as a whole.
  - Never recommend "the event" generically. Always name the specific sub-market that carries the edge.
When only one sibling is listed (or no sibling_context is given), still emit a 1-element "sibling_estimates" array for that market and set "recommended_sibling_slug" to that slug.

OUTPUT DISCIPLINE — enforced by JSON schema:
- "pick" is "Yes" or "No" — the side you recommend taking on the recommended sub-market.
- "action" is BUY / SELL / PASS.
- "current_price" is the live YES price in cents (integer 0-100) of the RECOMMENDED sub-market.
- "edge" is signed percentage points (e.g. +7.4 or -2.1), YES perspective of the recommended sub-market.
- "confidence" is an integer 0-100. Be honest — 50-70 typical, 80+ only with overwhelming evidence.
- "reasons" MUST be an array of EXACTLY 3 strings, each at least 40 characters. Ground each one in the resolution rules, an already-published observation, or the supplied context. Where the decisive facts are the rules and what has already printed, say so plainly — a reason that names a closed resolution path beats one carrying an unverified statistic.
- "key_risks" MUST be 1-3 strings, each at least 30 characters, each concrete and actionable.
- "market_slug" is the Polymarket slug of the RECOMMENDED sub-market.
- "recommended_sibling_slug" matches "market_slug" (or null if no siblings were provided).
- "sibling_estimates" — one entry per listed sibling. Each: {slug, fair_yes_cents (0-100 int), edge_cents (signed int), side ("Yes"|"No")}.

Every reason and risk must be concrete and traceable to something supplied — no generic platitudes. Be precise, but let confidence follow the evidence: if the supplied context is thin, a lower "confidence" and an honest gap is the correct output, not a confident number you cannot source.

Return ONLY the JSON matching the schema.`;

const RESULT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pick",
    "action",
    "current_price",
    "edge",
    "confidence",
    "reasons",
    "key_risks",
    "market_slug",
    "recommended_sibling_slug",
    "sibling_estimates",
  ],
  properties: {
    pick: { type: "string", enum: ["Yes", "No"] },
    action: { type: "string", enum: ["BUY", "SELL", "PASS"] },
    current_price: { type: "integer" },
    edge: { type: "number" },
    confidence: { type: "integer" },
    reasons: { type: "array", items: { type: "string" } },
    key_risks: { type: "array", items: { type: "string" } },
    market_slug: { type: ["string", "null"] },
    recommended_sibling_slug: { type: ["string", "null"] },
    sibling_estimates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slug", "fair_yes_cents", "edge_cents", "side"],
        properties: {
          slug: { type: "string" },
          fair_yes_cents: { type: "integer" },
          edge_cents: { type: "number" },
          side: { type: "string", enum: ["Yes", "No"] },
        },
      },
    },
  },
} as const;

type VisionExtract = {
  question?: string | null;
  platform?: string | null;
  slug_guess?: string | null;
  yes_price?: number | null;
  no_price?: number | null;
  volume_usd?: number | null;
  ends_at?: string | null;
  notes?: string | null;
  visible_yes_cents?: number | null;
  visible_no_cents?: number | null;
  visible_volume_usd?: number | null;
  visible_end_date?: string | null;
  visible_outcomes?: string[] | null;
  keywords?: string[] | null;
};

type AnalyzerJson = {
  pick?: string;
  action?: string;
  current_price?: number;
  edge?: number;
  confidence?: number;
  reasons?: string[];
  key_risks?: string[];
  market_slug?: string | null;
  recommended_sibling_slug?: string | null;
  sibling_estimates?: Array<{
    slug?: string;
    fair_yes_cents?: number;
    edge_cents?: number;
    side?: string;
  }>;
};

type PreparedContext = {
  market_data: { question: string; slug: string | null };
  polymarket_context: string | null;
  sibling_context: string | null;
  sentiment_context: string | null;
  snapshot: PolymarketSnapshot | null;
  vision: VisionExtract | null;
};

export function parseEffort(raw: unknown): AnalyzeEffort {
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return "medium";
}

export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

/** Build a data URL from base64 image bytes. */
export function dataUrlFromBase64(
  imageBase64: string,
  mimeType: string,
): { dataUrl: string | null; error?: string } {
  const mime = (mimeType || "").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return { dataUrl: null, error: "Only PNG, JPG, or WEBP images are supported" };
  }
  const raw = imageBase64.replace(/^data:[^;]+;base64,/, "");
  let bytes: Buffer;
  try {
    bytes = Buffer.from(raw, "base64");
  } catch {
    return { dataUrl: null, error: "Invalid base64 image data" };
  }
  if (bytes.length > MAX_BYTES) {
    return { dataUrl: null, error: "Image is larger than 8MB" };
  }
  return { dataUrl: `data:${mime};base64,${raw}` };
}

function visionToSignals(v: VisionExtract | null): VisionSignals {
  if (!v) return {};
  return {
    question: v.question ?? null,
    slug_guess: v.slug_guess ?? null,
    visible_yes_cents:
      typeof v.visible_yes_cents === "number"
        ? v.visible_yes_cents
        : typeof v.yes_price === "number"
          ? v.yes_price
          : null,
    visible_no_cents:
      typeof v.visible_no_cents === "number"
        ? v.visible_no_cents
        : typeof v.no_price === "number"
          ? v.no_price
          : null,
    visible_volume_usd:
      typeof v.visible_volume_usd === "number"
        ? v.visible_volume_usd
        : typeof v.volume_usd === "number"
          ? v.volume_usd
          : null,
    visible_end_date: v.visible_end_date ?? v.ends_at ?? null,
    visible_outcomes: Array.isArray(v.visible_outcomes) ? v.visible_outcomes : [],
    keywords: Array.isArray(v.keywords) ? v.keywords : [],
  };
}

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function normalizePick(v: unknown): AnalyzerPick {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "no" ? "No" : "Yes";
}

function normalizeAction(v: unknown): AnalyzerAction {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "BUY" || s === "SELL" || s === "PASS") return s;
  return "PASS";
}

function padReasons(input: string[]): string[] {
  const cleaned = input.map((x) => String(x ?? "").trim()).filter((x) => x.length > 0);
  const out = cleaned.slice(0, 3);
  while (out.length < 3) {
    out.push(
      "Additional reasoning was not available at analysis time — treat this leg of the thesis as provisional and re-check before sizing up.",
    );
  }
  return out;
}

function trimRisks(input: string[]): string[] {
  const cleaned = input.map((x) => String(x ?? "").trim()).filter((x) => x.length > 0).slice(0, 3);
  if (cleaned.length === 0) {
    return ["Market sentiment could shift rapidly if unexpected news breaks before resolution."];
  }
  return cleaned;
}

function buildSiblingEstimates(args: {
  pool: PolymarketSibling[];
  parsedSiblings: AnalyzerJson["sibling_estimates"];
  fallbackSnapshot: PolymarketSnapshot | null;
}): SiblingEstimate[] {
  const { pool, parsedSiblings, fallbackSnapshot } = args;

  if (pool.length === 0) {
    if (!fallbackSnapshot) return [];
    const yesCents = Math.round(fallbackSnapshot.yesPrice * 100);
    return [
      {
        slug: fallbackSnapshot.slug,
        question: fallbackSnapshot.question,
        market_price_cents: yesCents,
        fair_yes_cents: yesCents,
        edge_cents: 0,
        side: "Yes",
      },
    ];
  }

  const byParsedSlug = new Map<string, NonNullable<AnalyzerJson["sibling_estimates"]>[number]>();
  if (Array.isArray(parsedSiblings)) {
    for (const s of parsedSiblings) {
      if (s && typeof s.slug === "string") byParsedSlug.set(s.slug, s);
    }
  }

  const out: SiblingEstimate[] = [];
  for (const p of pool) {
    const parsed = byParsedSlug.get(p.slug);
    const fairYes = parsed ? clampInt(parsed.fair_yes_cents, 0, 100, p.yesCents) : p.yesCents;
    const edge = Math.round((fairYes - p.yesCents) * 10) / 10;
    let side: AnalyzerPick;
    if (parsed?.side === "Yes" || parsed?.side === "No") {
      side = parsed.side;
    } else {
      side = edge >= 0 ? "Yes" : "No";
    }
    out.push({
      slug: p.slug,
      question: p.question,
      market_price_cents: p.yesCents,
      fair_yes_cents: fairYes,
      edge_cents: edge,
      side,
    });
  }
  return out;
}

function safeParseJson<T>(text: string | null | undefined): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

function buildMockResult(
  slug: string | null,
  question: string,
  eventSlug: string | null = null,
  eventTitle: string | null = null,
): AnalyzerResult {
  const finalSlug = slug ?? "will-the-fed-cut-rates-in-december";
  const finalQ = question || "Will the Fed cut rates in December?";
  const marketPrice = 42;
  const edge = 8.4;
  return {
    pick: "Yes",
    action: "BUY",
    current_price: marketPrice,
    edge,
    confidence: 78,
    tier: confidenceTier(78),
    reasons: [
      "Market price sits 18 cents below fair value based on polling aggregates. Smart money wallets loaded positions yesterday.",
      "Comparable markets resolved identically in 2024 and 2025. No structural difference exists to break the pattern this time.",
      "CME FedWatch implies a 62% probability versus Polymarket's 42¢ print — a persistent multi-day gap that has not closed.",
    ],
    key_risks: [
      "Market sentiment could shift rapidly if unexpected news breaks before resolution.",
      "Liquidity is concentrated in the top-of-book — exiting a large position mid-event could cost 3-5 cents of slippage.",
    ],
    market_slug: finalSlug,
    event_slug: eventSlug,
    event_title: eventTitle,
    market_question: finalQ,
    sources: [],
    siblings: [
      {
        slug: finalSlug,
        question: finalQ,
        market_price_cents: marketPrice,
        fair_yes_cents: Math.round(marketPrice + edge),
        edge_cents: edge,
        side: "Yes",
      },
    ],
    recommended_sibling: {
      slug: finalSlug,
      question: finalQ,
      side: "Yes",
      market_price_cents: marketPrice,
      fair_price_cents: Math.round(marketPrice + edge),
      edge_cents: edge,
    },
  };
}

async function visionExtract(
  client: OpenAI,
  dataUrl: string,
  userContext: string | null,
): Promise<VisionExtract | null> {
  const userText =
    (userContext ? `User note: ${userContext}\n\n` : "") +
    "Extract the prediction-market data from this screenshot as JSON.";

  const resp = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: VISION_SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  return safeParseJson<VisionExtract>(resp.choices?.[0]?.message?.content ?? null);
}

async function prepareContext(args: {
  client: OpenAI | null;
  dataUrl: string | null;
  slug: string | null;
  userContext: string | null;
  /** Skip the Perplexity round-trip when the caller only needs the market. */
  skipSentiment?: boolean;
}): Promise<PreparedContext> {
  const { client, dataUrl, slug, userContext } = args;

  let vision: VisionExtract | null = null;
  if (dataUrl && client) {
    try {
      vision = await visionExtract(client, dataUrl, userContext);
    } catch {
      vision = null;
    }
  }

  let snapshot: PolymarketSnapshot | null = null;
  let resolveStrategy: string | null = null;
  let resolveScore = 0;

  let slugSnapshot: PolymarketSnapshot | null = null;
  if (slug) {
    slugSnapshot = await resolvePolymarket(slug);
    if (slugSnapshot) {
      console.log("[analyze] resolve: strategy=explicit-slug slug=%s event=%s", slugSnapshot.slug, slugSnapshot.eventSlug ?? "null");
    }
  }

  let searchSnapshot: PolymarketSnapshot | null = null;
  let searchDebugStrategy: string | null = null;
  let searchDebugScore = 0;
  {
    const signals = visionToSignals(vision);
    if (slug && !signals.slug_guess) signals.slug_guess = slug;

    if (signals.question || signals.slug_guess || (signals.keywords && signals.keywords.length > 0)) {
      const { snapshot: s, debug } = await resolveBestMarket(signals, {
        openaiClient: client,
      });
      searchSnapshot = s;
      searchDebugStrategy = debug.strategy;
      searchDebugScore = debug.score;
      console.log(
        "[analyze] resolve: strategy=%s score=%s slug=%s event=%s llm=%s cands=%d",
        debug.strategy ?? "none",
        debug.score,
        s?.slug ?? "null",
        s?.eventSlug ?? "null",
        debug.llmPickUsed ? "yes" : "no",
        debug.candidates.length,
      );
    }
  }

  if (slugSnapshot) {
    snapshot = slugSnapshot;
    resolveStrategy = "explicit-slug";
    resolveScore = 100;
  } else if (searchSnapshot) {
    snapshot = searchSnapshot;
    resolveStrategy = searchDebugStrategy;
    resolveScore = searchDebugScore;
  }

  const question =
    snapshot?.question?.trim() ||
    vision?.question?.trim() ||
    "Unknown prediction market";

  const finalSlug = snapshot?.slug ?? null;

  console.log(
    "[analyze] resolved market: slug=%s event=%s strategy=%s score=%s verified=%s",
    finalSlug,
    snapshot?.eventSlug ?? null,
    resolveStrategy ?? "none",
    resolveScore,
    snapshot ? "yes" : "no",
  );

  const sentiment_context = args.skipSentiment
    ? null
    : await fetchSentimentContext(question).catch(() => null);

  return {
    market_data: { question, slug: finalSlug },
    polymarket_context: snapshotToContext(snapshot),
    sibling_context: siblingsToContext(snapshot),
    sentiment_context,
    snapshot,
    vision,
  };
}

async function fetchSentimentContext(question: string): Promise<string | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content:
              "You are a news researcher. Return ONLY a tight bullet list (max 5 bullets) of the most recent, specific, and relevant news facts for the given prediction market question. Each bullet: one concrete fact with a date. No preamble, no commentary, no padding.",
          },
          {
            role: "user",
            content: `Find the latest news relevant to this prediction market: "${question}"`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 20 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function buildAnalyzerUserPrompt(args: {
  prepared: PreparedContext;
  userContext: string | null;
}): string {
  const { prepared, userContext } = args;
  const lines: string[] = [];
  lines.push("market_data:");
  lines.push(`  question: ${prepared.market_data.question}`);
  lines.push(`  slug: ${prepared.market_data.slug ?? "null"}`);
  if (prepared.polymarket_context) {
    lines.push("");
    lines.push("polymarket_context:");
    lines.push(prepared.polymarket_context);
  }
  if (prepared.sibling_context) {
    lines.push("");
    lines.push("sibling_context:");
    lines.push(prepared.sibling_context);
    lines.push("");
    lines.push(
      "This event contains multiple sibling sub-markets. Produce a fair-value estimate for EACH one in sibling_estimates (using the exact slug), then set recommended_sibling_slug to the sub-market with the largest absolute edge. Your top-level pick/action/current_price/edge/reasons/key_risks MUST refer to that specific sub-market, not the event as a whole.",
    );
  }
  if (prepared.sentiment_context) {
    lines.push("");
    lines.push("sentiment_context:");
    lines.push(prepared.sentiment_context);
  }
  lines.push("");
  lines.push(`user_datetime: ${new Date().toISOString()}`);
  if (userContext) {
    lines.push("");
    lines.push(`user_context: ${userContext}`);
  }
  lines.push("");
  lines.push(
    "Produce the calibrated analyzer_result JSON. Every reason must reference a specific fact/number. Every risk must be concrete.",
  );
  return lines.join("\n");
}

async function analyzeMarket(args: {
  client: OpenAI;
  prepared: PreparedContext;
  effort: AnalyzeEffort;
  dataUrl: string | null;
  userContext: string | null;
}): Promise<AnalyzerJson | null> {
  const { client, prepared, effort, dataUrl, userContext } = args;

  const userText = buildAnalyzerUserPrompt({ prepared, userContext });

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: userText },
  ];
  if (dataUrl) {
    userContent.push({ type: "image_url", image_url: { url: dataUrl } });
  }

  const resp = await client.chat.completions.create({
    model: "o4-mini",
    reasoning_effort: effort,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "analyzer_result",
        strict: true,
        schema: RESULT_JSON_SCHEMA,
      },
    },
    messages: [
      { role: "system", content: ANALYZER_SYSTEM },
      { role: "user", content: userContent },
    ],
  });

  return safeParseJson<AnalyzerJson>(resp.choices?.[0]?.message?.content ?? null);
}

/** Normalize raw input into slug + dataUrl for the pipeline. */
export function normalizeAnalyzeInput(input: AnalyzeInput): {
  slug: string | null;
  dataUrl: string | null;
  userContext: string | null;
  effort: AnalyzeEffort;
  error?: string;
} {
  const userContext =
    typeof input.context === "string" && input.context.trim().length > 0
      ? input.context.trim()
      : null;
  const effort = parseEffort(input.reasoning_effort);

  let dataUrl: string | null = input.dataUrl ?? null;
  let slug: string | null = null;

  if (typeof input.slug === "string" && input.slug.trim()) {
    slug = slugFromUrl(input.slug);
    if (!slug) return { slug: null, dataUrl: null, userContext, effort, error: "Invalid Polymarket slug" };
  } else if (typeof input.url === "string" && input.url.trim()) {
    slug = slugFromUrl(input.url);
    if (!slug) return { slug: null, dataUrl: null, userContext, effort, error: "Invalid Polymarket URL" };
  }

  if (!dataUrl && !slug) {
    return {
      slug: null,
      dataUrl: null,
      userContext,
      effort,
      error: "Provide a Polymarket url, slug, or screenshot.",
    };
  }

  return { slug, dataUrl, userContext, effort };
}

/** Summarize input for usage logs (no image data). */
export function summarizeAnalyzeInput(input: AnalyzeInput): string {
  if (input.url?.trim()) return input.url.trim().slice(0, 200);
  if (input.slug?.trim()) return input.slug.trim().slice(0, 200);
  if (input.dataUrl) return "[screenshot]";
  return "unknown";
}

/**
 * Resolve an input to a live Polymarket snapshot and stop there.
 *
 * This is the path behind analyze_market now that the calling model does the
 * judging: no analysis model, no sentiment fetch. A screenshot still costs one
 * small vision call to work out which market it is, because there is no other
 * way to turn pixels into a slug; a url or slug costs nothing.
 */
export async function resolveMarketSnapshot(
  input: AnalyzeInput,
): Promise<{ ok: true; snapshot: PolymarketSnapshot } | { ok: false; error: string }> {
  const normalized = normalizeAnalyzeInput(input);
  if (normalized.error) return { ok: false, error: normalized.error };

  const { slug, dataUrl, userContext } = normalized;
  // Only a screenshot needs the model; url/slug resolves against Polymarket alone.
  const client = dataUrl ? getOpenAIClient() : null;

  const ctx = await prepareContext({
    client,
    dataUrl,
    slug,
    userContext,
    skipSentiment: true,
  });

  if (!ctx.snapshot) {
    return {
      ok: false,
      error: dataUrl
        ? "Couldn't match that screenshot to a live Polymarket market. Paste the market URL instead — it resolves reliably."
        : `No live Polymarket market found for "${slug}". Closed and renamed markets 404; copy the address from the market page.`,
    };
  }

  return { ok: true, snapshot: ctx.snapshot };
}

/** Run the full analyzer pipeline. */
export async function runAnalyze(input: AnalyzeInput): Promise<AnalyzerResponse> {
  const normalized = normalizeAnalyzeInput(input);
  if (normalized.error) {
    return { ok: false, error: normalized.error };
  }

  const { slug, dataUrl, userContext, effort } = normalized;
  const client = getOpenAIClient();

  if (!client) {
    let mockSlug = slug;
    let mockEventSlug: string | null = null;
    let mockQuestion = "Will the Fed cut rates in December?";
    let mockEventTitle: string | null = null;
    if (slug) {
      const snap = await resolvePolymarket(slug).catch(() => null);
      if (snap) {
        mockSlug = snap.slug || slug;
        mockEventSlug = snap.eventSlug ?? null;
        mockEventTitle = snap.eventTitle ?? null;
        mockQuestion = snap.question || mockQuestion;
      }
    }
    return { ok: true, result: buildMockResult(mockSlug, mockQuestion, mockEventSlug, mockEventTitle) };
  }

  try {
    const prepared = await prepareContext({ client, dataUrl, slug, userContext });

    const parsed = await analyzeMarket({
      client,
      prepared,
      effort,
      dataUrl,
      userContext,
    });

    if (!parsed) {
      return { ok: false, error: "Could not parse analyzer output" };
    }

    const confidence = clampInt(parsed.confidence, 0, 100, 50);
    const reasons = padReasons(Array.isArray(parsed.reasons) ? parsed.reasons : []);
    const risks = trimRisks(Array.isArray(parsed.key_risks) ? parsed.key_risks : []);

    const snapshot = prepared.snapshot;

    if (!snapshot) {
      return {
        ok: false,
        error:
          "Couldn't find this market on Polymarket. The screenshot may be cropped, unclear, or from a different platform. Paste the Polymarket URL directly for a reliable pick.",
      };
    }

    const siblingPool: PolymarketSibling[] = snapshot.siblings ?? [];

    const siblings = buildSiblingEstimates({
      pool: siblingPool,
      parsedSiblings: parsed.sibling_estimates,
      fallbackSnapshot: snapshot,
    });

    const modelRecommendedSlug =
      typeof parsed.recommended_sibling_slug === "string"
        ? parsed.recommended_sibling_slug
        : null;
    let chosen = siblings.find((s) => s.slug === modelRecommendedSlug) ?? null;
    if (!chosen && siblings.length > 0) {
      chosen = siblings.slice().sort((a, b) => Math.abs(b.edge_cents) - Math.abs(a.edge_cents))[0];
    }

    const chosenSibling =
      chosen ? siblingPool.find((s) => s.slug === chosen!.slug) ?? null : null;

    const verifiedEventSlug = snapshot?.eventSlug ?? null;
    const verifiedEventTitle = snapshot?.eventTitle ?? null;
    const headlineSlug = chosenSibling?.slug ?? snapshot?.slug ?? null;
    const headlineQuestion = chosenSibling?.question ?? prepared.market_data.question;

    let topPick: AnalyzerPick;
    let topCurrentPrice: number;
    let topEdge: number;
    const recommendedSibling: RecommendedSibling | null = chosen
      ? (() => {
          const sidePrice =
            chosen.side === "Yes"
              ? chosen.market_price_cents
              : 100 - chosen.market_price_cents;
          const sideFair =
            chosen.side === "Yes" ? chosen.fair_yes_cents : 100 - chosen.fair_yes_cents;
          const sideEdge = sideFair - sidePrice;
          return {
            slug: chosen.slug,
            question: chosen.question,
            side: chosen.side,
            market_price_cents: sidePrice,
            fair_price_cents: sideFair,
            edge_cents: Math.round(sideEdge * 10) / 10,
          };
        })()
      : null;

    if (siblingPool.length > 1 && chosen) {
      topPick = chosen.side;
      topCurrentPrice = chosen.market_price_cents;
      topEdge = Math.round(chosen.edge_cents * 10) / 10;
    } else {
      topPick = normalizePick(parsed.pick);
      topCurrentPrice = clampInt(parsed.current_price, 0, 100, 50);
      topEdge = Math.round(clampNum(parsed.edge, -100, 100, 0) * 10) / 10;
    }

    const result: AnalyzerResult = {
      pick: topPick,
      action: normalizeAction(parsed.action),
      current_price: topCurrentPrice,
      edge: topEdge,
      confidence,
      tier: confidenceTier(confidence),
      reasons,
      key_risks: risks,
      market_slug: headlineSlug,
      event_slug: verifiedEventSlug,
      event_title: verifiedEventTitle,
      market_question: headlineQuestion,
      sources: [],
      siblings,
      recommended_sibling: recommendedSibling,
    };

    return { ok: true, result };
  } catch (e) {
    const msg = (e as Error)?.message || "Analyzer failed";
    return { ok: false, error: msg };
  }
}
