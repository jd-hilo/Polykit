"use client";
import { Inbox, Search, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GatedScreen } from "@/components/auth/GatedScreen";

type SearchResult = {
  question: string;
  eventSlug: string;
  marketSlug: string;
  yesPrice: number;
  liquidity: number;
};

type Position = {
  id: string;
  market_question: string;
  market_slug: string | null;
  event_slug: string | null;
  side: "YES" | "NO";
  entry_price: number;
  exit_price: number | null;
  size: number;
  status: "open" | "closed";
  pnl: number;
  created_at: string;
  closed_at: string | null;
};

type PositionsResponse = {
  positions: Position[];
  balance: number;
  pnl: number;
  openSizes: number;
  startingBalance: number;
};

/* ─── Colors / tokens ───────────────────────────────────────── */

const GREEN = "rgb(27,149,80)";
const GREEN_BG = "rgba(27,149,80,0.10)";
const GREEN_BG_HOVER = "rgba(27,149,80,0.18)";
const RED = "rgb(230,72,0)";
const RED_DARK = "rgb(185,28,28)";
const RED_BG = "rgba(230,72,0,0.10)";
const RED_BG_HOVER = "rgba(230,72,0,0.18)";
const BLUE = "rgb(36,99,235)";
const TEXT = "rgb(20,24,31)";
const MUTED = "rgb(107,114,128)";
const BORDER = "rgba(229,231,235,0.9)";
const HOVER_BG = "rgba(243,244,246,0.6)";

/* ─── Formatters ────────────────────────────────────────────── */

function fmt$(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cents(p: number): string {
  return `${Math.round(p * 100)}¢`;
}

function avatarColor(seed: string): string {
  // Deterministic pastel-ish color from the first char of seed.
  const palette = [
    "rgb(36,99,235)",
    "rgb(27,149,80)",
    "rgb(230,72,0)",
    "rgb(147,51,234)",
    "rgb(219,39,119)",
    "rgb(234,179,8)",
    "rgb(14,165,233)",
    "rgb(239,68,68)",
  ];
  const code = seed.trim().charCodeAt(0) || 0;
  return palette[code % palette.length];
}

function initial(question: string): string {
  const t = question.trim();
  return t.length > 0 ? t[0].toUpperCase() : "?";
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function PaperTrading() {
  const { hasAccess, subscriptionLoaded, openGate } = useAuth();
  const [data, setData] = useState<PositionsResponse | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadPositions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/positions", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // Fetch live YES price for each open position, then poll every 30s.
  useEffect(() => {
    if (!data) return;
    const openPositions = data.positions.filter(
      (p) => p.status === "open" && (p.market_slug || p.event_slug),
    );
    if (openPositions.length === 0) return;

    let cancelled = false;

    async function fetchPrices() {
      const next: Record<string, number> = {};
      await Promise.all(
        openPositions.map(async (p) => {
          const params = new URLSearchParams();
          if (p.market_slug) params.set("slug", p.market_slug);
          if (p.event_slug) params.set("event", p.event_slug);
          try {
            const res = await fetch(`/api/positions/price?${params.toString()}`, {
              cache: "no-store",
            });
            if (!res.ok) return;
            const json = (await res.json()) as { yesPrice?: number | null };
            if (typeof json.yesPrice === "number" && Number.isFinite(json.yesPrice)) {
              next[p.id] = json.yesPrice;
            }
          } catch {
            /* ignore */
          }
        }),
      );
      if (!cancelled) setLivePrices((prev) => ({ ...prev, ...next }));
    }

    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [data]);

  async function closePosition(id: string) {
    const res = await fetch(`/api/positions/${id}/close`, { method: "PUT" });
    if (res.ok) loadPositions();
  }

  const balance = data?.balance ?? 100000;
  const pnl = data?.pnl ?? 0;
  const rows = data?.positions ?? [];
  const openRows = rows.filter((r) => r.status === "open");

  // Derived: open-position current value (using share-based math).
  const openCurrentValue = useMemo(() => {
    let total = 0;
    for (const r of openRows) {
      const yes = livePrices[r.id];
      const sideCurrent =
        yes == null
          ? r.entry_price
          : r.side === "YES"
            ? yes
            : 1 - yes;
      if (r.entry_price > 0 && r.entry_price < 1) {
        const shares = r.size / r.entry_price;
        total += shares * sideCurrent;
      } else {
        total += r.size;
      }
    }
    return total;
  }, [openRows, livePrices]);

  const portfolio = balance + openCurrentValue;

  if (subscriptionLoaded && !hasAccess) {
    return <GatedScreen featureName="Paper Trading" />;
  }

  return (
    <div
      style={{
        padding: "0 32px 40px",
        fontFamily:
          "OpenSauceOne, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: TEXT,
        backgroundColor: "rgb(255,255,255)",
        minHeight: "100%",
      }}
    >
      {/* Portfolio strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginTop: 8,
          marginBottom: 24,
        }}
      >
        <StatCard label="Portfolio" value={fmt$(portfolio)} />
        <StatCard
          label="P&L"
          value={`${pnl >= 0 ? "+" : ""}${fmt$(pnl)}`}
          color={pnl > 0.5 ? GREEN : pnl < -0.5 ? RED_DARK : undefined}
        />
        <StatCard label="Cash" value={fmt$(balance)} />
      </div>

      {/* Market search + card grid */}
      <MarketBrowser balance={balance} onTradePlaced={loadPositions} />

      {/* Open positions */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          margin: "32px 0 14px",
          color: TEXT,
        }}
      >
        Open Positions
      </div>
      {!loading && openRows.length === 0 && (
        <EmptyPositions />
      )}

      {openRows.length > 0 && (
        <div
          style={{
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: "rgb(255,255,255)",
          }}
        >
          {openRows.map((r, i) => (
            <PositionRow
              key={r.id}
              position={r}
              livePriceYes={livePrices[r.id]}
              isLast={i === openRows.length - 1}
              onClose={() => closePosition(r.id)}
            />
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 32,
          fontSize: 11,
          color: MUTED,
          textAlign: "center",
        }}
      >
        Paper trading — no real money at risk.
      </div>
    </div>
  );
}

/* ─── Market browser (search + card grid + inline entry) ──── */

function MarketBrowser({
  balance,
  onTradePlaced,
}: {
  balance: number;
  onTradePlaced: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which card is actively being traded, and which side.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<"YES" | "NO">("YES");

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setActiveKey(null);
    try {
      const res = await fetch(`/api/positions/search?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Search failed");
        return;
      }
      setResults(Array.isArray(data?.results) ? data.results : []);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  function startTrade(key: string, side: "YES" | "NO") {
    setActiveKey(key);
    setActiveSide(side);
  }

  function cancelTrade() {
    setActiveKey(null);
  }

  async function handleTraded() {
    setActiveKey(null);
    onTradePlaced();
  }

  return (
    <div>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: "rgb(255,255,255)",
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: "0 14px",
            height: 46,
          }}
        >
          <Search size={18} style={{ color: MUTED, flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
            placeholder="Search markets to trade"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 14,
              color: TEXT,
              backgroundColor: "transparent",
              padding: "12px 0",
              fontFamily: "inherit",
            }}
          />
        </div>
        <button
          onClick={runSearch}
          disabled={loading}
          style={{
            height: 46,
            padding: "0 22px",
            fontSize: 14,
            fontWeight: 600,
            color: "rgb(255,255,255)",
            backgroundColor: BLUE,
            border: "none",
            borderRadius: 12,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            flexShrink: 0,
            fontFamily: "inherit",
          }}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            fontSize: 12,
            color: "rgb(153,27,27)",
            backgroundColor: "rgba(254,226,226,0.6)",
            border: "1px solid rgba(252,165,165,0.5)",
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Empty state: no search */}
      {!results && !loading && !error && <SearchHint />}

      {/* Empty state: no results */}
      {results && results.length === 0 && !loading && (
        <div
          style={{
            padding: "40px 16px",
            textAlign: "center",
            fontSize: 14,
            color: MUTED,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
          }}
        >
          No markets found for &ldquo;{query}&rdquo;.
        </div>
      )}

      {/* Grid of cards */}
      {results && results.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 14,
          }}
        >
          {results.map((r, i) => {
            const key = `${r.marketSlug}-${i}`;
            const isActive = activeKey === key;
            const dimmed = activeKey !== null && !isActive;
            return (
              <MarketCard
                key={key}
                result={r}
                dimmed={dimmed}
                isActive={isActive}
                activeSide={activeSide}
                balance={balance}
                onStartTrade={(side) => startTrade(key, side)}
                onCancelTrade={cancelTrade}
                onTraded={handleTraded}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SearchHint() {
  return (
    <div
      style={{
        padding: "40px 16px",
        textAlign: "center",
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        backgroundColor: "rgba(248,250,252,0.5)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          backgroundColor: "rgba(36,99,235,0.10)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <TrendingUp size={20} style={{ color: BLUE }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
        Find a market to trade
      </div>
      <div style={{ fontSize: 13, color: MUTED }}>
        Try searching: <em>trump</em>, <em>bitcoin</em>, <em>election</em>, <em>NFL</em>
      </div>
    </div>
  );
}

/* ─── Market card (with inline trade entry) ──────────────── */

function MarketCard({
  result,
  dimmed,
  isActive,
  activeSide,
  balance,
  onStartTrade,
  onCancelTrade,
  onTraded,
}: {
  result: SearchResult;
  dimmed: boolean;
  isActive: boolean;
  activeSide: "YES" | "NO";
  balance: number;
  onStartTrade: (side: "YES" | "NO") => void;
  onCancelTrade: () => void;
  onTraded: () => void;
}) {
  const [hovered, setHovered] = useState<"YES" | "NO" | null>(null);
  const yesCents = Math.round(result.yesPrice * 100);
  const noCents = 100 - yesCents;

  const color = avatarColor(result.question);

  return (
    <div
      style={{
        backgroundColor: "rgb(255,255,255)",
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 16,
        opacity: dimmed ? 0.4 : 1,
        pointerEvents: dimmed ? "none" : "auto",
        transition: "opacity 180ms ease",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header: avatar + question */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: color,
            color: "rgb(255,255,255)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initial(result.question)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            title={result.question}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: TEXT,
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {result.question}
          </div>
        </div>
      </div>

      {/* Two big buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          type="button"
          onClick={() => onStartTrade("YES")}
          onMouseEnter={() => setHovered("YES")}
          onMouseLeave={() => setHovered(null)}
          style={{
            padding: "12px 10px",
            fontSize: 14,
            fontWeight: 700,
            color: GREEN,
            backgroundColor:
              isActive && activeSide === "YES"
                ? GREEN_BG_HOVER
                : hovered === "YES"
                  ? GREEN_BG_HOVER
                  : GREEN_BG,
            border:
              isActive && activeSide === "YES"
                ? `1px solid ${GREEN}`
                : "1px solid transparent",
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: "inherit",
            fontVariantNumeric: "tabular-nums",
            transition: "background-color 120ms ease",
          }}
        >
          Buy Yes {yesCents}¢
        </button>
        <button
          type="button"
          onClick={() => onStartTrade("NO")}
          onMouseEnter={() => setHovered("NO")}
          onMouseLeave={() => setHovered(null)}
          style={{
            padding: "12px 10px",
            fontSize: 14,
            fontWeight: 700,
            color: RED,
            backgroundColor:
              isActive && activeSide === "NO"
                ? RED_BG_HOVER
                : hovered === "NO"
                  ? RED_BG_HOVER
                  : RED_BG,
            border:
              isActive && activeSide === "NO"
                ? `1px solid ${RED}`
                : "1px solid transparent",
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: "inherit",
            fontVariantNumeric: "tabular-nums",
            transition: "background-color 120ms ease",
          }}
        >
          Buy No {noCents}¢
        </button>
      </div>

      {/* Footer: volume */}
      <div
        style={{
          fontSize: 12,
          color: MUTED,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        Vol {fmt$(result.liquidity)}
      </div>

      {/* Inline trade entry */}
      {isActive && (
        <InlineTradeEntry
          selected={result}
          side={activeSide}
          balance={balance}
          onCancel={onCancelTrade}
          onSubmitted={onTraded}
        />
      )}
    </div>
  );
}

/* ─── Inline trade entry form ────────────────────────────── */

function InlineTradeEntry({
  selected,
  side,
  balance,
  onCancel,
  onSubmitted,
}: {
  selected: SearchResult;
  side: "YES" | "NO";
  balance: number;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const sidePrice = side === "YES" ? selected.yesPrice : 1 - selected.yesPrice;
  const sideCents = Math.round(sidePrice * 100);
  const sideColor = side === "YES" ? GREEN : RED;
  const sideBg = side === "YES" ? GREEN_BG : RED_BG;

  const [stake, setStake] = useState<string>("100");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stakeNum = Number(stake);
  const validStake = Number.isFinite(stakeNum) && stakeNum > 0 && stakeNum <= balance;
  const shares = validStake && sidePrice > 0 ? stakeNum / sidePrice : 0;
  const winnings = shares; // shares * $1
  const profit = winnings - (validStake ? stakeNum : 0);

  const presets: { label: string; value: number | "max" }[] = [
    { label: "$10", value: 10 },
    { label: "$25", value: 25 },
    { label: "$100", value: 100 },
    { label: "$500", value: 500 },
    { label: "$1k", value: 1000 },
    { label: "Max", value: "max" },
  ];

  function pickPreset(v: number | "max") {
    if (v === "max") {
      setStake(String(Math.floor(balance)));
    } else {
      setStake(String(v));
    }
  }

  async function submit() {
    if (!validStake) {
      setErr("Enter a valid stake within your balance.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketQuestion: selected.question,
          marketSlug: selected.marketSlug,
          eventSlug: selected.eventSlug,
          side,
          entryPrice: Number(sidePrice.toFixed(2)),
          size: stakeNum,
          status: "open",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(data?.error ?? "Failed to create position");
        return;
      }
      onSubmitted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 4,
        paddingTop: 14,
        borderTop: `1px solid ${BORDER}`,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Side chip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 12px",
            borderRadius: 999,
            backgroundColor: sideBg,
            color: sideColor,
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Buy {side === "YES" ? "Yes" : "No"} {sideCents}¢
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            color: MUTED,
            cursor: "pointer",
            borderRadius: 6,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Preset stake chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        {presets.map((p) => {
          const isSelected =
            (p.value === "max" && Number(stake) === Math.floor(balance)) ||
            (typeof p.value === "number" && Number(stake) === p.value);
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => pickPreset(p.value)}
              style={{
                flex: "0 0 auto",
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: isSelected ? "rgb(255,255,255)" : TEXT,
                backgroundColor: isSelected ? TEXT : "rgb(255,255,255)",
                border: `1px solid ${isSelected ? TEXT : BORDER}`,
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "inherit",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Custom amount */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: MUTED,
            marginBottom: 4,
          }}
        >
          Amount — available {fmt$(balance)}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 12px",
            backgroundColor: "rgb(255,255,255)",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
          }}
        >
          <span style={{ color: MUTED, fontSize: 14, fontWeight: 600 }}>$</span>
          <input
            type="number"
            min="1"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            style={{
              flex: 1,
              padding: "11px 0",
              fontSize: 14,
              fontWeight: 600,
              color: TEXT,
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "inherit",
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </div>
      </div>

      {/* Live calc block */}
      <div
        style={{
          padding: "12px 14px",
          backgroundColor: "rgba(248,250,252,0.7)",
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <Row label="Shares" value={validStake ? shares.toFixed(2) : "—"} />
        <Row label="If you win" value={validStake ? fmt$(winnings) : "—"} />
        <Row
          label="Potential profit"
          value={validStake ? `+${fmt$(profit)}` : "—"}
          valueColor={GREEN}
          bold
        />
      </div>

      {err && (
        <div
          style={{
            padding: "8px 12px",
            fontSize: 12,
            color: "rgb(153,27,27)",
            backgroundColor: "rgba(254,226,226,0.6)",
            border: "1px solid rgba(252,165,165,0.5)",
            borderRadius: 8,
          }}
        >
          {err}
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy || !validStake}
        style={{
          width: "100%",
          height: 48,
          fontSize: 15,
          fontWeight: 700,
          color: "rgb(255,255,255)",
          backgroundColor: BLUE,
          border: "none",
          borderRadius: 12,
          cursor: busy || !validStake ? "not-allowed" : "pointer",
          opacity: busy || !validStake ? 0.5 : 1,
          fontFamily: "inherit",
        }}
      >
        {busy ? "Placing…" : "Place Order"}
      </button>

      <button
        type="button"
        onClick={onCancel}
        style={{
          background: "transparent",
          border: "none",
          color: MUTED,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "inherit",
          padding: 0,
          alignSelf: "center",
        }}
      >
        Cancel
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  valueColor,
  bold,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: MUTED }}>{label}</span>
      <span
        style={{
          color: valueColor ?? TEXT,
          fontWeight: bold ? 700 : 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Open position row (Polymarket style) ─────────────── */

function PositionRow({
  position,
  livePriceYes,
  isLast,
  onClose,
}: {
  position: Position;
  livePriceYes: number | undefined;
  isLast: boolean;
  onClose: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [sellHover, setSellHover] = useState(false);

  const sideCurrent =
    livePriceYes == null
      ? null
      : position.side === "YES"
        ? livePriceYes
        : 1 - livePriceYes;

  let livePnl: number | null = null;
  if (sideCurrent != null && position.entry_price > 0 && position.entry_price < 1) {
    const shares = position.size / position.entry_price;
    livePnl = (sideCurrent - position.entry_price) * shares;
  }
  const displayPnl = livePnl ?? Number(position.pnl);

  const pnlPos = displayPnl > 0.5;
  const pnlNeg = displayPnl < -0.5;
  const pnlColor = pnlPos ? GREEN : pnlNeg ? RED_DARK : MUTED;

  const sideColor = position.side === "YES" ? GREEN : RED;
  const sideBg = position.side === "YES" ? GREEN_BG : RED_BG;

  const color = avatarColor(position.market_question);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr auto auto auto auto",
        gap: 16,
        padding: "14px 18px",
        alignItems: "center",
        borderBottom: isLast ? "none" : `1px solid ${BORDER}`,
        backgroundColor: hover ? HOVER_BG : "transparent",
        transition: "background-color 120ms ease",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          backgroundColor: color,
          color: "rgb(255,255,255)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {initial(position.market_question)}
      </div>

      {/* Title + meta */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: TEXT,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={position.market_question}
        >
          {position.market_question}
        </div>
        <div
          style={{
            fontSize: 12,
            color: MUTED,
            marginTop: 2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Size {fmt$(position.size)} · Entry {cents(position.entry_price)}
        </div>
      </div>

      {/* Side pill */}
      <span
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          color: sideColor,
          backgroundColor: sideBg,
        }}
      >
        {position.side === "YES" ? "Yes" : "No"}
      </span>

      {/* Current price big */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: TEXT,
          fontVariantNumeric: "tabular-nums",
          minWidth: 56,
          textAlign: "right",
        }}
      >
        {sideCurrent != null ? cents(sideCurrent) : "—"}
      </div>

      {/* P&L */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: pnlColor,
          fontVariantNumeric: "tabular-nums",
          minWidth: 90,
          textAlign: "right",
        }}
      >
        {displayPnl >= 0 ? "+" : ""}
        {fmt$(displayPnl)}
      </div>

      {/* Sell */}
      <button
        onClick={onClose}
        onMouseEnter={() => setSellHover(true)}
        onMouseLeave={() => setSellHover(false)}
        style={{
          height: 34,
          padding: "0 16px",
          fontSize: 13,
          fontWeight: 700,
          color: sellHover ? RED_DARK : TEXT,
          backgroundColor: sellHover ? RED_BG : "rgb(255,255,255)",
          border: `1px solid ${sellHover ? "rgba(230,72,0,0.3)" : BORDER}`,
          borderRadius: 8,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 120ms ease",
        }}
      >
        Sell
      </button>
    </div>
  );
}

/* ─── Empty positions state ───────────────────────────────── */

function EmptyPositions() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 16px",
        color: MUTED,
        fontSize: 14,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        backgroundColor: "rgba(248,250,252,0.5)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          backgroundColor: "rgba(107,114,128,0.10)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Inbox size={20} style={{ color: MUTED }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
        No open positions yet
      </div>
      <div style={{ fontSize: 13, color: MUTED }}>
        Search a market above and place your first trade.
      </div>
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────── */

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        backgroundColor: "rgba(248,250,252,0.5)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: MUTED,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: color ?? TEXT,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
