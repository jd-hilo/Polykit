"use client";
import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GatedScreen } from "@/components/auth/GatedScreen";

type Position = {
  proxyWallet: string;
  title: string;
  outcome: string;
  size: number;
  avgPrice: number;
  curPrice: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  redeemable: boolean;
  eventSlug: string;
  icon: string | null;
  endDate: string | null;
};

function fmt$(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

function shortWallet(w: string) {
  if (!w || w.length <= 10) return w;
  return `${w.slice(0, 6)}…${w.slice(-4)}`;
}

function isValidAddress(v: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(v.trim());
}

export default function WalletTracker() {
  const { hasAccess, subscriptionLoaded, openGate } = useAuth();
  const [input, setInput] = useState("");
  const [wallet, setWallet] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (subscriptionLoaded && !hasAccess) {
    return <GatedScreen featureName="Wallet Tracker" />;
  }

  async function lookup(addr: string) {
    const clean = addr.trim().toLowerCase();
    if (!isValidAddress(clean)) {
      setError("Enter a valid Ethereum wallet address (0x…)");
      return;
    }
    setWallet(clean);
    setPositions([]);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/wallet-tracker?user=${encodeURIComponent(clean)}`,
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error ?? "Failed to load positions");
        return;
      }
      setPositions(Array.isArray(data.positions) ? data.positions : []);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  const totalPnl = positions.reduce((s, p) => s + p.cashPnl, 0);
  const pnlPositive = totalPnl > 0.5;
  const pnlNegative = totalPnl < -0.5;

  return (
    <div
      style={{
        padding: "0 32px 40px",
        fontFamily:
          "OpenSauceOne, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "rgb(20,24,31)",
        backgroundColor: "rgb(255,255,255)",
        minHeight: "100%",
      }}
    >
      <div style={{ height: 52, paddingTop: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, lineHeight: "28px", margin: 0 }}>
          Wallet Tracker
        </h1>
      </div>

      {/* Search */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: 12,
          backgroundColor: "rgba(243,244,246,0.6)",
          border: "1px solid rgba(229,231,235,0.8)",
          borderRadius: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: "rgb(255,255,255)",
            border: "1px solid rgba(229,231,235,0.8)",
            borderRadius: 10,
            padding: "0 12px",
          }}
        >
          <Search size={16} style={{ color: "rgb(107,114,128)", flexShrink: 0 }} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") lookup(input); }}
            placeholder="Paste a Polymarket wallet address (0x…)"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "rgb(20,24,31)",
              backgroundColor: "transparent",
              padding: "10px 0",
              fontFamily: "inherit",
            }}
          />
        </div>
        <button
          onClick={() => lookup(input)}
          disabled={loading}
          style={{
            height: 40,
            padding: "0 20px",
            fontSize: 13,
            fontWeight: 600,
            color: "rgb(255,255,255)",
            backgroundColor: "rgb(36,99,235)",
            border: "none",
            borderRadius: 10,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            flexShrink: 0,
          }}
        >
          {loading ? "Loading…" : "Track"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            fontSize: 13,
            color: "rgb(153,27,27)",
            backgroundColor: "rgba(254,226,226,0.6)",
            border: "1px solid rgba(252,165,165,0.5)",
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Summary */}
      {wallet && !loading && positions.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <StatCard label="Wallet" value={shortWallet(wallet)} mono />
          <StatCard label="Open positions" value={String(positions.length)} />
          <StatCard
            label="Total P&L"
            value={fmt$(totalPnl)}
            color={pnlPositive ? "rgb(21,128,61)" : pnlNegative ? "rgb(185,28,28)" : undefined}
          />
        </div>
      )}

      {wallet && !loading && positions.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "rgb(107,114,128)", fontSize: 14 }}>
          No open positions found for this wallet.
        </div>
      )}

      {/* Positions table */}
      {positions.length > 0 && (
        <div style={{ border: "1px solid rgba(229,231,235,0.8)", borderRadius: 16, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 80px 90px 80px",
              padding: "10px 16px",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "rgb(107,114,128)",
              backgroundColor: "rgba(243,244,246,0.5)",
              borderBottom: "1px solid rgba(229,231,235,0.8)",
            }}
          >
            <span>Market</span>
            <span style={{ textAlign: "right" }}>Outcome</span>
            <span style={{ textAlign: "right" }}>Price</span>
            <span style={{ textAlign: "right" }}>Value</span>
            <span style={{ textAlign: "right" }}>P&L</span>
          </div>

          {positions.map((p, i) => {
            const pnlPos = p.cashPnl > 0.5;
            const pnlNeg = p.cashPnl < -0.5;
            const pnlColor = pnlPos ? "rgb(21,128,61)" : pnlNeg ? "rgb(185,28,28)" : "rgb(107,114,128)";
            const PnlIcon = pnlPos ? TrendingUp : pnlNeg ? TrendingDown : Minus;
            return (
              <a
                key={`${p.eventSlug}-${p.outcome}-${i}`}
                href={`https://polymarket.com/event/${p.eventSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 80px 90px 80px",
                  padding: "12px 16px",
                  fontSize: 12,
                  textDecoration: "none",
                  color: "rgb(20,24,31)",
                  borderBottom: i < positions.length - 1 ? "1px solid rgba(229,231,235,0.5)" : "none",
                  alignItems: "center",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(243,244,246,0.5)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {p.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.icon}
                      alt=""
                      width={28}
                      height={28}
                      style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, objectFit: "cover" }}
                    />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}
                      title={p.title}
                    >
                      {p.title}
                    </div>
                    {p.endDate && (
                      <div style={{ fontSize: 10, color: "rgb(107,114,128)", marginTop: 2 }}>
                        Resolves {p.endDate}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "right",
                    fontWeight: 500,
                    color: p.outcome === "Yes" ? "rgb(21,128,61)" : p.outcome === "No" ? "rgb(185,28,28)" : "rgb(20,24,31)",
                  }}
                >
                  {p.outcome}
                </div>

                <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {Math.round(p.curPrice * 100)}¢
                </div>

                <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                  {fmt$(p.currentValue)}
                </div>

                <div
                  style={{
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    color: pnlColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 4,
                  }}
                >
                  <PnlIcon size={12} />
                  {fmt$(p.cashPnl)}
                </div>
              </a>
            );
          })}
        </div>
      )}

      {!wallet && !loading && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "rgb(107,114,128)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
            Track any Polymarket wallet
          </div>
          <div style={{ fontSize: 13 }}>
            Paste a wallet address above to see their open positions and P&L.
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, mono }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        border: "1px solid rgba(229,231,235,0.8)",
        borderRadius: 12,
        backgroundColor: "rgba(248,250,252,0.5)",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgb(107,114,128)", marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: color ?? "rgb(20,24,31)",
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}
