// Polymarket data helpers.
//
// Polymarket exposes two public APIs:
//   - Gamma:  https://gamma-api.polymarket.com  (markets + events metadata)
//   - CLOB:   https://clob.polymarket.com       (order book / live prices)
//
// We use Gamma here — it already includes snapshot prices in `outcomePrices`.
// No SDK, just fetch.

export type PolymarketSibling = {
  question: string;
  slug: string;
  yesCents: number;         // 0..100 int
  noCents: number;          // 0..100 int
  volumeUsd: number;
  liquidityUsd: number;
  endDate: string | null;   // ISO
};

export type PolymarketSnapshot = {
  slug: string;             // market slug
  eventSlug: string | null; // event slug — what polymarket.com/event/<slug> actually uses
  eventTitle: string | null;
  question: string;
  yesPrice: number;         // 0..1
  noPrice: number;          // 0..1
  volumeUsd: number;
  liquidityUsd: number;
  endsAt: string | null;    // ISO
  description: string | null;
  // All sub-markets of the same event (sibling outcomes). Excludes dead
  // branches (YES <= 1¢ / >= 99¢, liq < $1k). Always includes the current
  // market if possible. A single-market event yields a 1-element array.
  siblings: PolymarketSibling[];
};

const GAMMA_BASE = "https://gamma-api.polymarket.com";

/* ──────────────────────────────────────────────────────────── *
 * Slug parsing                                                  *
 * ──────────────────────────────────────────────────────────── */

/**
 * Accepts either a full polymarket.com URL or a raw slug, returns the slug
 * portion only (lowercased, no query/hash). Returns null on bad input.
 *
 *   slugFromUrl("https://polymarket.com/event/will-trump-win-2024?foo=1")
 *     → "will-trump-win-2024"
 *   slugFromUrl("will-trump-win-2024")
 *     → "will-trump-win-2024"
 */
export function slugFromUrl(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try URL parse first.
  try {
    const maybeUrl = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const u = new URL(maybeUrl);
    if (u.hostname.endsWith("polymarket.com")) {
      // Path is like /event/{slug} or /market/{slug} (possibly with trailing).
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "event" || p === "market");
      const slug = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : parts[parts.length - 1];
      return sanitizeSlug(slug);
    }
  } catch {
    /* fall through — treat as raw slug */
  }

  // Raw slug fallback.
  return sanitizeSlug(trimmed);
}

function sanitizeSlug(s: string | undefined): string | null {
  if (!s) return null;
  const cleaned = s.split("?")[0].split("#")[0].trim().toLowerCase();
  if (!cleaned) return null;
  // Must look slug-ish — letters, digits, dashes.
  if (!/^[a-z0-9][a-z0-9-]{0,200}$/.test(cleaned)) return null;
  return cleaned;
}

/* ──────────────────────────────────────────────────────────── *
 * Gamma fetch                                                   *
 * ──────────────────────────────────────────────────────────── */

type GammaMarket = {
  id?: string | number;
  question?: string;
  slug?: string;
  outcomePrices?: string | string[];
  outcomes?: string | string[];
  volume?: string | number;
  volumeNum?: number;
  liquidity?: string | number;
  liquidityNum?: number;
  endDate?: string | null;
  description?: string | null;
  events?: Array<{ slug?: string; title?: string; markets?: GammaMarket[] }>;
};

type GammaEvent = {
  id?: string | number;
  slug?: string;
  title?: string;
  description?: string | null;
  markets?: GammaMarket[];
};

/**
 * Build a sibling entry from a raw Gamma market. Returns null when the market
 * is effectively dead (price pinned at 0/100¢) or too thin to execute.
 */
function buildSibling(m: GammaMarket): PolymarketSibling | null {
  const slug = (m.slug ?? "").toString();
  const question = (m.question ?? "").toString();
  if (!slug || !question) return null;

  const prices = parseStringArray(m.outcomePrices).map((x) => Number(x));
  const outcomes = parseStringArray(m.outcomes);
  let yes = 0;
  let no = 0;
  if (prices.length >= 2) {
    const yesIdx = outcomes.findIndex((o) => /^yes$/i.test(o));
    const noIdx = outcomes.findIndex((o) => /^no$/i.test(o));
    yes = Number.isFinite(prices[yesIdx >= 0 ? yesIdx : 0]) ? prices[yesIdx >= 0 ? yesIdx : 0] : 0;
    no = Number.isFinite(prices[noIdx >= 0 ? noIdx : 1]) ? prices[noIdx >= 0 ? noIdx : 1] : 0;
  } else if (prices.length === 1) {
    yes = Number.isFinite(prices[0]) ? prices[0] : 0;
    no = Math.max(0, 1 - yes);
  }
  const yesCents = Math.round(clamp01(yes) * 100);
  const noCents = Math.round(clamp01(no) * 100);

  const volumeUsd = parseNum(m.volumeNum ?? m.volume);
  const liquidityUsd = parseNum(m.liquidityNum ?? m.liquidity);

  // Filter dead branches — but use a LOWER bar than the coach's trending
  // filter because the user explicitly pointed at this event and might still
  // want to see nearly-resolved legs for context.
  if (yesCents <= 1 || yesCents >= 99) return null;
  if (liquidityUsd < 1_000) return null;

  return {
    question,
    slug,
    yesCents,
    noCents,
    volumeUsd,
    liquidityUsd,
    endDate: m.endDate ?? null,
  };
}

function siblingsFromEvent(markets: GammaMarket[] | undefined): PolymarketSibling[] {
  if (!Array.isArray(markets) || markets.length === 0) return [];
  const out: PolymarketSibling[] = [];
  for (const m of markets) {
    const s = buildSibling(m);
    if (s) out.push(s);
  }
  return out;
}

async function gammaFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${GAMMA_BASE}${path}`, {
    headers: { accept: "application/json" },
    // Polymarket data changes on the minute — don't let Next cache forever.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Polymarket gamma ${path} returned ${res.status}`);
  }
  return (await res.json()) as T;
}

function parseStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    } catch {
      /* not JSON */
    }
  }
  return [];
}

function parseNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeMarket(m: GammaMarket): PolymarketSnapshot {
  const prices = parseStringArray(m.outcomePrices).map((x) => Number(x));
  const outcomes = parseStringArray(m.outcomes);
  // Gamma convention: outcomes[0] = "Yes" / outcomes[1] = "No".
  let yesPrice = 0;
  let noPrice = 0;
  if (prices.length >= 2) {
    const yesIdx = outcomes.findIndex((o) => /^yes$/i.test(o));
    const noIdx = outcomes.findIndex((o) => /^no$/i.test(o));
    yesPrice = Number.isFinite(prices[yesIdx >= 0 ? yesIdx : 0]) ? prices[yesIdx >= 0 ? yesIdx : 0] : 0;
    noPrice = Number.isFinite(prices[noIdx >= 0 ? noIdx : 1]) ? prices[noIdx >= 0 ? noIdx : 1] : 0;
  } else if (prices.length === 1) {
    yesPrice = Number.isFinite(prices[0]) ? prices[0] : 0;
    noPrice = Math.max(0, 1 - yesPrice);
  }

  const volumeUsd = parseNum(m.volumeNum ?? m.volume);
  const liquidityUsd = parseNum(m.liquidityNum ?? m.liquidity);

  const rawEvent = Array.isArray(m.events) && m.events[0] ? m.events[0] : null;
  const rawEventSlug = rawEvent?.slug ?? null;
  const rawEventTitle = rawEvent?.title ?? null;

  // Build siblings from the nested event's markets array when present.
  // Fall back to a single-element array with just this market.
  let siblings = siblingsFromEvent(rawEvent?.markets);
  if (siblings.length === 0) {
    const self = buildSibling(m);
    if (self) siblings = [self];
  }

  return {
    slug: (m.slug ?? "").toString(),
    eventSlug: typeof rawEventSlug === "string" && rawEventSlug.trim() ? rawEventSlug.trim() : null,
    eventTitle: typeof rawEventTitle === "string" && rawEventTitle.trim() ? rawEventTitle.trim() : null,
    question: (m.question ?? "").toString(),
    yesPrice: clamp01(yesPrice),
    noPrice: clamp01(noPrice),
    volumeUsd,
    liquidityUsd,
    endsAt: m.endDate ?? null,
    description: m.description ?? null,
    siblings,
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Fetch a single market by its slug via the Gamma API.
 * Throws if no match found.
 */
export async function getMarketBySlug(slug: string): Promise<PolymarketSnapshot> {
  const cleaned = sanitizeSlug(slug);
  if (!cleaned) throw new Error("Invalid Polymarket slug");

  const data = await gammaFetch<GammaMarket[]>(`/markets?slug=${encodeURIComponent(cleaned)}`);
  const hit = Array.isArray(data) ? data[0] : null;
  if (!hit) throw new Error(`No Polymarket market found for slug "${cleaned}"`);
  return normalizeMarket(hit);
}

/**
 * Fetch an event by slug and return its first market.
 * URLs that look like `/event/{slug}` point at an event, not a market —
 * this is the correct endpoint for those.
 */
export async function getEventBySlug(slug: string): Promise<PolymarketSnapshot> {
  const cleaned = sanitizeSlug(slug);
  if (!cleaned) throw new Error("Invalid Polymarket slug");

  const data = await gammaFetch<GammaEvent[]>(`/events?slug=${encodeURIComponent(cleaned)}`);
  const event = Array.isArray(data) ? data[0] : null;
  if (!event) throw new Error(`No Polymarket event found for slug "${cleaned}"`);
  const market = event.markets?.[0];
  if (!market) throw new Error(`Polymarket event "${cleaned}" has no markets`);

  // Event metadata is sometimes richer than per-market — use it as fallback.
  const snap = normalizeMarket(market);
  if (!snap.slug) snap.slug = cleaned;
  // We looked this up by event slug — carry it forward so callers can build
  // polymarket.com/event/<slug> URLs even if the nested market lacks events[].
  if (!snap.eventSlug) snap.eventSlug = event.slug ?? cleaned;
  if (!snap.eventTitle && event.title) snap.eventTitle = event.title;
  if (!snap.description && event.description) snap.description = event.description;
  if (!snap.question && event.title) snap.question = event.title;

  // When hit via /events, the nested market often lacks its own events[] array
  // so normalizeMarket() falls back to the single-market sibling list. Replace
  // it with the authoritative full siblings pulled from the event response.
  const fullSiblings = siblingsFromEvent(event.markets);
  if (fullSiblings.length > 0) snap.siblings = fullSiblings;
  return snap;
}

/**
 * Given a snapshot that resolved via /markets (which doesn't nest siblings),
 * enrich it with the full event sibling list so the analyzer can see all
 * sub-markets of the same event. No-op if no eventSlug or if siblings already
 * cover the whole event.
 */
async function enrichSiblings(snap: PolymarketSnapshot): Promise<PolymarketSnapshot> {
  if (!snap.eventSlug) return snap;
  // Already fetched via /events — siblings present.
  if (snap.siblings.length > 1) return snap;
  try {
    const data = await gammaFetch<GammaEvent[]>(
      `/events?slug=${encodeURIComponent(snap.eventSlug)}`,
    );
    const event = Array.isArray(data) ? data[0] : null;
    if (!event) return snap;
    const full = siblingsFromEvent(event.markets);
    if (full.length > 0) {
      snap.siblings = full;
      if (!snap.eventTitle && event.title) snap.eventTitle = event.title;
    }
  } catch {
    /* ignore — keep single-element siblings */
  }
  return snap;
}

/**
 * Try market then event. Returns null (no throw) so the analyzer pipeline
 * can degrade gracefully when a slug guess is wrong.
 */
export async function resolvePolymarket(slug: string): Promise<PolymarketSnapshot | null> {
  try {
    const snap = await getMarketBySlug(slug);
    return await enrichSiblings(snap);
  } catch {
    /* fall through to event lookup */
  }
  try {
    return await getEventBySlug(slug);
  } catch {
    return null;
  }
}

/**
 * Fuzzy full-text search fallback for when an exact slug lookup misses.
 *
 * NOTE: The Gamma API's `q=` / `search=` query parameters do NOT perform
 * text search — they are silently ignored and the API returns default-sorted
 * results regardless of the value. The correct approach is to bulk-fetch the
 * top active markets by volume and do client-side word-overlap scoring.
 *
 * We fetch events (which embed their sub-markets with full price data) sorted
 * by volume24hr so the most-traded markets appear first in the 200-item window.
 * For Iran, US elections, crypto, etc. this consistently surfaces the right
 * market within that window.
 *
 * Returns null if no active market scores a reasonable title overlap.
 */
export async function searchPolymarketByQuestion(
  question: string,
): Promise<PolymarketSnapshot | null> {
  const q = (question || "").trim();
  if (!q) return null;

  const words = contentWords(q);
  if (words.length === 0) return null;
  const qWords = new Set(words);

  // Bulk-fetch top active events by volume — markets are embedded with prices.
  let events: GammaEvent[] = [];
  try {
    events = await gammaFetch<GammaEvent[]>(
      `/events?active=true&closed=false&limit=200&order=volume24hr&ascending=false`,
    );
  } catch {
    return null;
  }
  if (!Array.isArray(events) || events.length === 0) return null;

  // Score each market across all events by word overlap with the query.
  let bestMarket: GammaMarket | null = null;
  let bestEvent: GammaEvent | null = null;
  let bestScore = 0;

  for (const e of events) {
    const markets = Array.isArray(e.markets) ? e.markets : [];
    for (const m of markets) {
      const mq = (m.question ?? "").toLowerCase();
      if (!mq) continue;
      const mWords = new Set(contentWords(mq));
      let score = 0;
      for (const w of qWords) if (mWords.has(w)) score += 1;
      if (score > bestScore) {
        bestScore = score;
        bestMarket = m;
        bestEvent = e;
      }
    }
  }

  // Require at least 2 shared content words to accept.
  if (!bestMarket || bestScore < 2) return null;

  // Inject event metadata into the market so normalizeMarket sees siblings.
  const withEvent: GammaMarket = {
    ...bestMarket,
    events: bestMarket.events ?? [
      { slug: bestEvent!.slug, title: bestEvent!.title, markets: bestEvent!.markets ?? [] },
    ],
  };
  const snap = normalizeMarket(withEvent);
  if (!snap.eventSlug && bestEvent?.slug) snap.eventSlug = bestEvent.slug;
  if (!snap.eventTitle && bestEvent?.title) snap.eventTitle = bestEvent.title;
  const fullSiblings = siblingsFromEvent(bestEvent?.markets);
  if (fullSiblings.length > 0) snap.siblings = fullSiblings;
  return snap;
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "will",
  "with", "this", "that", "from", "have", "has", "was", "were", "been",
  "would", "could", "should", "what", "when", "where", "which", "who",
  "whom", "into", "about", "over", "under", "than", "then", "them", "they",
  "their", "there", "these", "those", "does", "did", "doing", "done",
  "any", "some", "each", "every",
]);

/* ──────────────────────────────────────────────────────────── *
 * Multi-strategy market resolver                                *
 * ──────────────────────────────────────────────────────────── */

export type VisionSignals = {
  question?: string | null;
  slug_guess?: string | null;
  visible_yes_cents?: number | null;
  visible_no_cents?: number | null;
  visible_volume_usd?: number | null;
  visible_end_date?: string | null;
  visible_outcomes?: string[] | null;
  keywords?: string[] | null;
};

export type ResolverCandidate = {
  slug: string;
  question: string;
  eventSlug: string | null;
  eventTitle: string | null;
  yesCents: number;
  endDate: string | null;
  volumeUsd: number;
  raw: GammaMarket;
  // Scoring fields — populated by scoreCandidate().
  score?: number;
  scoreBreakdown?: Record<string, number>;
  strategy?: string;
};

export type ResolveDebug = {
  strategy: string | null;
  score: number;
  candidates: Array<{
    slug: string;
    question: string;
    score: number;
    breakdown: Record<string, number>;
    strategy: string;
  }>;
  llmPickUsed: boolean;
};

// 60s in-memory cache for Gamma search results so retries don't hammer.
// IMPORTANT: The Gamma API's q=/search= params are silently ignored — they do
// NOT filter results. We cache the single bulk-fetch (top 200 events by
// volume24hr) and do all text matching client-side from that pool.
type CacheEntry<T> = { value: T; expires: number };
const gammaEventsCache = new Map<string, CacheEntry<GammaEvent[]>>();
const CACHE_TTL_MS = 60_000;

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const hit = map.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    map.delete(key);
    return null;
  }
  return hit.value;
}
function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, value: T) {
  map.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

/**
 * Fetch the top active events by 24-hour volume and cache them.
 * All strategy functions share this single bulk fetch; client-side word
 * matching handles relevance (the API's q= param is non-functional).
 */
async function cachedEventsBulk(): Promise<GammaEvent[]> {
  const key = "__bulk__";
  const cached = cacheGet(gammaEventsCache, key);
  if (cached) return cached;
  try {
    const data = await gammaFetch<GammaEvent[]>(
      `/events?active=true&closed=false&limit=200&order=volume24hr&ascending=false`,
    );
    const arr = Array.isArray(data) ? data : [];
    cacheSet(gammaEventsCache, key, arr);
    return arr;
  } catch {
    cacheSet(gammaEventsCache, key, []);
    return [];
  }
}

/**
 * Filter the bulk event pool to events/markets whose title or market question
 * contains at least one of the supplied keywords (case-insensitive substring).
 * Returns matching markets with event context injected.
 */
function filterEventPoolByKeywords(
  events: GammaEvent[],
  keywords: string[],
): GammaMarket[] {
  if (keywords.length === 0) return [];
  const lcKws = keywords.map((k) => k.toLowerCase());
  const out: GammaMarket[] = [];
  for (const e of events) {
    const eventText = (e.title ?? "").toLowerCase();
    const markets = Array.isArray(e.markets) ? e.markets : [];
    const eventMatches = lcKws.some((k) => eventText.includes(k));
    for (const m of markets) {
      const mText = (m.question ?? "").toLowerCase();
      if (eventMatches || lcKws.some((k) => mText.includes(k))) {
        out.push({
          ...m,
          events: m.events ?? [{ slug: e.slug, title: e.title, markets }],
        });
      }
    }
  }
  return out;
}

/**
 * Return all markets from the bulk event pool that match the given keywords.
 * Used by strategyB and strategyC in place of the broken q= API param.
 * The `_q` parameter is kept for API compatibility but ignored — we always
 * draw from the shared bulk cache.
 */
async function cachedMarketSearch(_q: string, keywords?: string[]): Promise<GammaMarket[]> {
  const pool = await cachedEventsBulk();
  const kws = keywords && keywords.length > 0 ? keywords : [_q];
  return filterEventPoolByKeywords(pool, kws);
}

async function cachedEventSearch(_q: string, keywords?: string[]): Promise<GammaEvent[]> {
  const pool = await cachedEventsBulk();
  if (!pool.length) return [];
  const kws = keywords && keywords.length > 0 ? keywords : [_q];
  const lcKws = kws.map((k) => k.toLowerCase());
  return pool.filter((e) => {
    const title = (e.title ?? "").toLowerCase();
    if (lcKws.some((k) => title.includes(k))) return true;
    const markets = Array.isArray(e.markets) ? e.markets : [];
    return markets.some((m) =>
      lcKws.some((k) => (m.question ?? "").toLowerCase().includes(k)),
    );
  });
}

function contentWords(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function slugVariations(slug: string): string[] {
  const out = new Set<string>();
  out.add(slug);
  // swap underscores/spaces → dashes
  out.add(slug.replace(/[_\s]+/g, "-"));
  // strip trailing year
  out.add(slug.replace(/-20\d{2}$/, ""));
  // strip trailing "-by-..." windows
  out.add(slug.replace(/-by-[a-z0-9-]+$/, ""));
  // strip trailing numeric id
  out.add(slug.replace(/-\d+$/, ""));
  // double-stripped
  out.add(slug.replace(/-\d+$/, "").replace(/-20\d{2}$/, ""));
  return [...out].filter((s) => s && s.length > 2);
}

function candidateFromMarket(m: GammaMarket, strategy: string): ResolverCandidate | null {
  const slug = (m.slug ?? "").toString();
  const question = (m.question ?? "").toString();
  if (!slug || !question) return null;

  const prices = parseStringArray(m.outcomePrices).map((x) => Number(x));
  const outcomes = parseStringArray(m.outcomes);
  let yes = 0;
  if (prices.length >= 2) {
    const yesIdx = outcomes.findIndex((o) => /^yes$/i.test(o));
    yes = Number.isFinite(prices[yesIdx >= 0 ? yesIdx : 0]) ? prices[yesIdx >= 0 ? yesIdx : 0] : 0;
  } else if (prices.length === 1) {
    yes = Number.isFinite(prices[0]) ? prices[0] : 0;
  }
  const yesCents = Math.round(clamp01(yes) * 100);
  const rawEvent = Array.isArray(m.events) && m.events[0] ? m.events[0] : null;

  return {
    slug,
    question,
    eventSlug: rawEvent?.slug ?? null,
    eventTitle: rawEvent?.title ?? null,
    yesCents,
    endDate: m.endDate ?? null,
    volumeUsd: parseNum(m.volumeNum ?? m.volume),
    raw: m,
    strategy,
  };
}

function scoreCandidate(cand: ResolverCandidate, vis: VisionSignals): {
  score: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};

  // (1) Question similarity — word overlap ratio. Weight 40.
  const visWords = new Set(contentWords(vis.question || ""));
  const candWords = new Set(contentWords(cand.question));
  let shared = 0;
  for (const w of visWords) if (candWords.has(w)) shared += 1;
  const qRatio = visWords.size === 0 ? 0 : shared / visWords.size;
  // Floor: require >=2 shared content tokens OR small question (len<=2)
  const meetsFloor = shared >= 2 || (visWords.size > 0 && visWords.size <= 2 && shared >= 1);
  breakdown.questionSim = meetsFloor ? Math.round(qRatio * 40) : Math.round(qRatio * 10);

  // (2) Keyword coverage — weight 30.
  const kws = Array.isArray(vis.keywords) ? vis.keywords.filter(Boolean) : [];
  if (kws.length > 0) {
    const haystack = (cand.question + " " + (cand.eventTitle ?? "")).toLowerCase();
    let hit = 0;
    for (const k of kws) {
      const kl = String(k).toLowerCase().trim();
      if (!kl) continue;
      if (haystack.includes(kl)) hit += 1;
    }
    breakdown.keywordCov = Math.round((hit / kws.length) * 30);
  } else {
    breakdown.keywordCov = 0;
  }

  // (3) YES price match — weight 15.
  if (typeof vis.visible_yes_cents === "number" && Number.isFinite(vis.visible_yes_cents)) {
    const diff = Math.abs(cand.yesCents - vis.visible_yes_cents);
    if (diff <= 3) breakdown.priceMatch = 15;
    else if (diff <= 7) breakdown.priceMatch = 8;
    else if (diff <= 15) breakdown.priceMatch = 2;
    else breakdown.priceMatch = -5;
  } else {
    breakdown.priceMatch = 0;
  }

  // (4) End date match — weight 10.
  if (vis.visible_end_date && cand.endDate) {
    try {
      const vt = new Date(vis.visible_end_date).getTime();
      const ct = new Date(cand.endDate).getTime();
      if (Number.isFinite(vt) && Number.isFinite(ct)) {
        const days = Math.abs(vt - ct) / 86400000;
        if (days <= 3) breakdown.dateMatch = 10;
        else if (days <= 14) breakdown.dateMatch = 4;
        else breakdown.dateMatch = 0;
      } else breakdown.dateMatch = 0;
    } catch {
      breakdown.dateMatch = 0;
    }
  } else {
    breakdown.dateMatch = 0;
  }

  // (5) Volume proximity — weight 5.
  if (typeof vis.visible_volume_usd === "number" && vis.visible_volume_usd > 0 && cand.volumeUsd > 0) {
    const ratio = cand.volumeUsd / vis.visible_volume_usd;
    if (ratio >= 0.5 && ratio <= 2) breakdown.volumeProx = 5;
    else breakdown.volumeProx = 0;
  } else {
    breakdown.volumeProx = 0;
  }

  const score =
    breakdown.questionSim +
    breakdown.keywordCov +
    breakdown.priceMatch +
    breakdown.dateMatch +
    breakdown.volumeProx;
  return { score, breakdown };
}

async function strategyA_slug(vis: VisionSignals): Promise<ResolverCandidate[]> {
  const slug = vis.slug_guess ? slugFromUrl(vis.slug_guess) : null;
  if (!slug) return [];
  const variations = slugVariations(slug);
  const out: ResolverCandidate[] = [];
  const seen = new Set<string>();
  for (const v of variations) {
    // Try /markets?slug=
    try {
      const data = await gammaFetch<GammaMarket[]>(`/markets?slug=${encodeURIComponent(v)}`);
      if (Array.isArray(data)) {
        for (const m of data) {
          const c = candidateFromMarket(m, "A-slug");
          if (c && !seen.has(c.slug)) {
            seen.add(c.slug);
            out.push(c);
          }
        }
      }
    } catch {
      /* ignore */
    }
    // Try /events?slug= and expand markets
    try {
      const data = await gammaFetch<GammaEvent[]>(`/events?slug=${encodeURIComponent(v)}`);
      if (Array.isArray(data)) {
        for (const e of data) {
          const markets = Array.isArray(e.markets) ? e.markets : [];
          for (const m of markets) {
            // inject event info
            const withEvent: GammaMarket = {
              ...m,
              events: m.events ?? [{ slug: e.slug, title: e.title, markets }],
            };
            const c = candidateFromMarket(withEvent, "A-event-slug");
            if (c && !seen.has(c.slug)) {
              seen.add(c.slug);
              out.push(c);
            }
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

async function strategyB_multiQuery(vis: VisionSignals): Promise<ResolverCandidate[]> {
  // Collect distinctive keywords from question + explicit keywords list.
  // Since the Gamma API ignores q= params, we do client-side substring
  // matching via cachedMarketSearch — pass all keywords at once.
  const kws = (vis.keywords ?? []).map((k) => String(k).trim()).filter(Boolean);
  const q = (vis.question ?? "").trim();
  const questionWords = contentWords(q);

  // Build a deduplicated list of search terms: individual keywords + top
  // content words from the question.
  const terms = [...new Set([
    ...kws.map((k) => k.toLowerCase()),
    ...questionWords.slice(0, 8),
  ])].filter(Boolean);

  if (terms.length === 0) return [];

  // Single call: filter the bulk pool by any of the keyword terms.
  const markets = await cachedMarketSearch("", terms);

  const out: ResolverCandidate[] = [];
  const seen = new Set<string>();
  for (const m of markets) {
    const c = candidateFromMarket(m, "B-search");
    if (c && !seen.has(c.slug)) {
      seen.add(c.slug);
      out.push(c);
    }
  }
  return out.slice(0, 40);
}

async function strategyC_events(vis: VisionSignals): Promise<ResolverCandidate[]> {
  // Build keyword list from explicit keywords + question content words.
  const kws = (vis.keywords ?? []).map((k) => String(k).trim()).filter(Boolean);
  const q = (vis.question ?? "").trim();
  const questionWords = contentWords(q);
  const terms = [...new Set([
    ...kws.map((k) => k.toLowerCase()),
    ...questionWords.slice(0, 6),
  ])].filter(Boolean);

  if (terms.length === 0) return [];

  // Single call: filter the shared bulk pool by any of the keyword terms.
  const events = await cachedEventSearch("", terms);

  const out: ResolverCandidate[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    const markets = Array.isArray(e.markets) ? e.markets : [];
    for (const m of markets) {
      const withEvent: GammaMarket = {
        ...m,
        events: m.events ?? [{ slug: e.slug, title: e.title, markets }],
      };
      const c = candidateFromMarket(withEvent, "C-events");
      if (c && !seen.has(c.slug)) {
        seen.add(c.slug);
        out.push(c);
      }
    }
  }
  return out.slice(0, 40);
}

async function strategyD_outcomes(vis: VisionSignals): Promise<ResolverCandidate[]> {
  const outcomes = (vis.visible_outcomes ?? []).map((o) => String(o).trim()).filter(Boolean);
  if (outcomes.length < 3) return [];

  // Filter the shared bulk pool by outcome names.
  const terms = outcomes.slice(0, 4).map((o) => o.toLowerCase());
  const events = await cachedEventSearch("", terms);

  const out: ResolverCandidate[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    const markets = Array.isArray(e.markets) ? e.markets : [];
    // Require this event to mention at least 2 of the outcome names.
    const eventText = (
      (e.title ?? "") + " " + markets.map((m) => m.question ?? "").join(" ")
    ).toLowerCase();
    let hits = 0;
    for (const o of outcomes) if (eventText.includes(o.toLowerCase())) hits += 1;
    if (hits < 2) continue;
    for (const m of markets) {
      const withEvent: GammaMarket = {
        ...m,
        events: m.events ?? [{ slug: e.slug, title: e.title, markets }],
      };
      const c = candidateFromMarket(withEvent, "D-outcomes");
      if (c && !seen.has(c.slug)) {
        seen.add(c.slug);
        out.push(c);
      }
    }
  }
  return out.slice(0, 40);
}

// Narrow structural type so we don't need to import OpenAI here. Use `any` on
// args to tolerate the real SDK's heavily overloaded signature.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenAILike = { chat: { completions: { create: (args: any) => Promise<any> } } };

async function llmPicker(
  client: OpenAILike,
  vis: VisionSignals,
  top: ResolverCandidate[],
): Promise<string | null> {
  const model = process.env.OPENAI_MODEL_PICKER ?? "gpt-4o-mini";
  const visSummary = {
    question: vis.question ?? null,
    yes_cents: vis.visible_yes_cents ?? null,
    no_cents: vis.visible_no_cents ?? null,
    end_date: vis.visible_end_date ?? null,
    keywords: vis.keywords ?? [],
    outcomes: vis.visible_outcomes ?? [],
  };
  const cands = top.slice(0, 8).map((c) => ({
    slug: c.slug,
    question: c.question,
    event_title: c.eventTitle,
    yes_cents: c.yesCents,
    end_date: c.endDate,
  }));

  const sys =
    "You match a Polymarket screenshot to one of several candidate markets. Be strict — only pick if the question + outcomes + any visible prices plausibly describe the same market. Don't force a match. Return ONLY strict JSON {\"slug\": \"...\" | null}.";
  const user = `Visible signals:\n${JSON.stringify(visSummary, null, 2)}\n\nCandidates:\n${JSON.stringify(
    cands,
    null,
    2,
  )}\n\nReturn JSON {\"slug\": <matching slug from the candidate list> | null}.`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });
    clearTimeout(timer);
    const text = resp.choices?.[0]?.message?.content ?? null;
    if (!text) return null;
    try {
      const parsed = JSON.parse(text) as { slug?: string | null };
      if (!parsed || typeof parsed.slug !== "string") return null;
      // Validate slug is in candidates
      if (top.some((c) => c.slug === parsed.slug)) return parsed.slug;
      return null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Multi-strategy resolver. Given vision signals from a screenshot, find the
 * best-matching Polymarket market.
 */
export async function resolveBestMarket(
  vis: VisionSignals,
  opts?: { openaiClient?: OpenAILike | null; debug?: boolean },
): Promise<{ snapshot: PolymarketSnapshot | null; debug: ResolveDebug }> {
  const debug: ResolveDebug = {
    strategy: null,
    score: 0,
    candidates: [],
    llmPickUsed: false,
  };

  // Run strategies in parallel.
  const [a, b, c, d] = await Promise.all([
    strategyA_slug(vis),
    strategyB_multiQuery(vis),
    strategyC_events(vis),
    strategyD_outcomes(vis),
  ]);

  // Merge, dedupe by slug, preferring earlier strategies' labels.
  const all: ResolverCandidate[] = [];
  const seen = new Set<string>();
  for (const arr of [a, b, c, d]) {
    for (const cand of arr) {
      if (!seen.has(cand.slug)) {
        seen.add(cand.slug);
        all.push(cand);
      }
    }
  }

  if (all.length === 0) {
    return { snapshot: null, debug };
  }

  // Score all candidates.
  for (const cand of all) {
    const { score, breakdown } = scoreCandidate(cand, vis);
    cand.score = score;
    cand.scoreBreakdown = breakdown;
  }
  all.sort((x, y) => (y.score ?? 0) - (x.score ?? 0));

  debug.candidates = all.slice(0, 10).map((x) => ({
    slug: x.slug,
    question: x.question,
    score: x.score ?? 0,
    breakdown: x.scoreBreakdown ?? {},
    strategy: x.strategy ?? "?",
  }));

  const top = all[0];
  const second = all[1];
  const MIN_ACCEPT = 25;      // below this → reject even top
  const STRONG_ACCEPT = 55;   // above this → accept without LLM
  const AMBIGUOUS_BAND = 0.15; // top within 15% of #2 → ambiguous

  let chosen: ResolverCandidate | null = null;

  if ((top.score ?? 0) < MIN_ACCEPT) {
    // No candidate is good enough — optionally defer to LLM if we have one.
    chosen = null;
  } else if ((top.score ?? 0) >= STRONG_ACCEPT) {
    // Check ambiguity
    const topScore = top.score ?? 0;
    const secondScore = second?.score ?? 0;
    const ratio = topScore === 0 ? 1 : (topScore - secondScore) / topScore;
    if (ratio >= AMBIGUOUS_BAND || !second) {
      chosen = top;
    } else {
      chosen = null; // ambiguous — let LLM decide
    }
  } else {
    // Middle band — let LLM decide
    chosen = null;
  }

  if (!chosen && opts?.openaiClient) {
    debug.llmPickUsed = true;
    const pickedSlug = await llmPicker(opts.openaiClient, vis, all.slice(0, 8));
    if (pickedSlug) {
      chosen = all.find((x) => x.slug === pickedSlug) ?? null;
    } else if ((top.score ?? 0) >= STRONG_ACCEPT) {
      // LLM punted but score was strong — accept top anyway.
      chosen = top;
    }
  } else if (!chosen && !opts?.openaiClient && (top.score ?? 0) >= MIN_ACCEPT) {
    // No LLM available — fall back to top if it clears the minimum.
    chosen = top;
  }

  if (!chosen) {
    return { snapshot: null, debug };
  }

  debug.strategy = chosen.strategy ?? null;
  debug.score = chosen.score ?? 0;

  // Normalize the chosen market. When it came via an event, the raw market
  // already has events[] injected by the strategy functions — so siblings
  // are populated by normalizeMarket. If not, enrich from the event slug.
  let snap = normalizeMarket(chosen.raw);

  // If the event has multiple sub-markets and we have a visible YES price,
  // prefer the sub-market whose YES price is closest to vision.visible_yes_cents.
  // This matters when the user is looking at a specific leg of a multi-market
  // event but the scorer picked the event's first/highest-volume sub-market.
  if (snap.siblings.length > 1 && typeof vis.visible_yes_cents === "number") {
    const target = vis.visible_yes_cents;
    let closestSibling: PolymarketSibling | null = null;
    let closestDiff = Infinity;
    for (const sib of snap.siblings) {
      const diff = Math.abs(sib.yesCents - target);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestSibling = sib;
      }
    }
    // If the closest sibling is substantially nearer to the observed price
    // than the current choice, swap — but only within 20¢ of the target.
    if (closestSibling && closestDiff <= 20 && closestSibling.slug !== snap.slug) {
      // Find the raw market for the closest sibling in the event pool.
      const eventMarkets = chosen.raw.events?.[0]?.markets ?? [];
      const rawSib = eventMarkets.find((m) => m.slug === closestSibling!.slug);
      if (rawSib) {
        const sibWithEvent: GammaMarket = {
          ...rawSib,
          events: chosen.raw.events,
        };
        const sibSnap = normalizeMarket(sibWithEvent);
        if (sibSnap.slug) snap = sibSnap;
      }
    }
  }

  // Ensure siblings are populated from the event context.
  const enriched = await enrichSiblings(snap);

  console.log(
    "[resolveBestMarket] strategy=%s score=%s slug=%s event=%s",
    debug.strategy ?? "none",
    debug.score,
    enriched.slug ?? "null",
    enriched.eventSlug ?? "null",
  );

  return { snapshot: enriched, debug };
}

/**
 * Render a PolymarketSnapshot as a compact, human-readable string to feed the
 * reasoning model. Returns null on nullish input.
 */
/* ──────────────────────────────────────────────────────────── *
 * Leaderboard                                                   *
 * ──────────────────────────────────────────────────────────── */

export type LeaderboardWindow = "1d" | "7d" | "30d" | "all";
export type LeaderboardMetric = "profit" | "volume";

export type LeaderboardRow = {
  rank: number;
  wallet: string;
  displayName: string;
  pseudonym: string;
  profileImage: string | null;
  bio: string | null;
  amount: number;
};

const LB_BASE = "https://lb-api.polymarket.com";

type RawLbRow = {
  proxyWallet?: unknown;
  wallet?: unknown;
  address?: unknown;
  amount?: unknown;
  profit?: unknown;
  volume?: unknown;
  name?: unknown;
  pseudonym?: unknown;
  username?: unknown;
  bio?: unknown;
  profileImage?: unknown;
  profile_image?: unknown;
  image?: unknown;
  positions?: unknown;
};

function shortWallet(w: string): string {
  if (!w) return "";
  if (w.length <= 10) return w;
  return `${w.slice(0, 6)}…${w.slice(-4)}`;
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

export async function getPolymarketLeaderboard(opts: {
  metric: LeaderboardMetric;
  window: LeaderboardWindow;
  limit?: number;
}): Promise<LeaderboardRow[]> {
  const { metric, window: win } = opts;
  const limit = Math.max(1, Math.min(100, opts.limit ?? 50));

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10_000);

  let data: unknown = null;
  try {
    const url = `${LB_BASE}/${metric}?window=${encodeURIComponent(win)}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      throw new Error(`Polymarket leaderboard ${metric} returned ${res.status}`);
    }
    data = await res.json();
  } finally {
    clearTimeout(t);
  }

  // Accept either bare arrays or { data: [...] } / { rows: [...] } wrappers.
  let arr: unknown[] = [];
  if (Array.isArray(data)) {
    arr = data;
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) arr = obj.data as unknown[];
    else if (Array.isArray(obj.rows)) arr = obj.rows as unknown[];
    else if (Array.isArray(obj.leaderboard)) arr = obj.leaderboard as unknown[];
  }

  const rows: LeaderboardRow[] = [];
  for (let i = 0; i < arr.length && rows.length < limit; i++) {
    const raw = arr[i] as RawLbRow | null;
    if (!raw || typeof raw !== "object") continue;

    const wallet =
      pickString(raw.proxyWallet, raw.wallet, raw.address) ?? "";
    if (!wallet) continue;

    // Prefer the canonical "amount" but fall back to metric-specific keys.
    const amount = parseNum(
      raw.amount ?? (metric === "profit" ? raw.profit : raw.volume),
    );

    const pseudonym = pickString(raw.pseudonym, raw.username) ?? shortWallet(wallet);
    const name = pickString(raw.name);
    const displayName = name || pseudonym || shortWallet(wallet);
    const profileImage = pickString(raw.profileImage, raw.profile_image, raw.image);
    const bio = pickString(raw.bio);

    rows.push({
      rank: rows.length + 1,
      wallet,
      displayName,
      pseudonym,
      profileImage,
      bio,
      amount,
    });
  }

  return rows;
}

export function snapshotToContext(snap: PolymarketSnapshot | null): string | null {
  if (!snap) return null;
  const yes = Math.round(snap.yesPrice * 100);
  const no = Math.round(snap.noPrice * 100);
  const lines = [
    `Polymarket slug: ${snap.slug}`,
    snap.eventSlug ? `Polymarket event slug: ${snap.eventSlug}` : null,
    snap.eventTitle ? `Event title: ${snap.eventTitle}` : null,
    `Question: ${snap.question}`,
  ].filter((l): l is string => !!l);
  lines.push(
    ...[
    `Live prices: YES ${yes}¢ / NO ${no}¢`,
    `Volume (USD): ${Math.round(snap.volumeUsd).toLocaleString()}`,
    `Liquidity (USD): ${Math.round(snap.liquidityUsd).toLocaleString()}`,
  ]);
  if (snap.endsAt) lines.push(`Ends at: ${snap.endsAt}`);
  if (snap.description) lines.push(`Description: ${snap.description.slice(0, 600)}`);
  return lines.join("\n");
}

/**
 * Render all sibling sub-markets as a compact context block for the analyzer.
 * Used when the event contains multiple sub-markets so the reasoning model
 * can score each one and pick the best edge.
 */
export function siblingsToContext(snap: PolymarketSnapshot | null): string | null {
  if (!snap) return null;
  if (!snap.siblings || snap.siblings.length <= 1) return null;
  const lines: string[] = [];
  const header = snap.eventTitle ?? "(unknown event)";
  lines.push(`Event: ${header}`);
  if (snap.eventSlug) lines.push(`Event slug: ${snap.eventSlug}`);
  lines.push(`Sibling sub-markets (${snap.siblings.length} total):`);
  for (const s of snap.siblings) {
    const bits = [
      `- "${s.question.slice(0, 110)}"`,
      `market=${s.slug}`,
      `YES ${s.yesCents}¢ / NO ${s.noCents}¢`,
      s.liquidityUsd > 0 ? `liq $${Math.round(s.liquidityUsd / 1000)}k` : "",
      s.volumeUsd > 0 ? `vol $${Math.round(s.volumeUsd / 1000)}k` : "",
      s.endDate ? `resolves ${new Date(s.endDate).toISOString().slice(0, 10)}` : "",
    ].filter(Boolean);
    lines.push(bits.join(" · "));
  }
  return lines.join("\n");
}
