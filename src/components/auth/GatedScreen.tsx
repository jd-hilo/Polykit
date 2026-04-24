"use client";
import { useState } from "react";

const FAKE_ROWS = [
  { w: "65%", tag: "YES", pnl: "+$312.40", green: true },
  { w: "50%", tag: "NO",  pnl: "-$84.10",  green: false },
  { w: "75%", tag: "YES", pnl: "+$1,204.00", green: true },
  { w: "40%", tag: "YES", pnl: "+$57.80",  green: true },
  { w: "58%", tag: "NO",  pnl: "-$201.50", green: false },
];

const COPY: Record<string, { headline: string; sub: string }> = {
  "Wallet Tracker": {
    headline: "Wallet Tracking is Pro-only.",
    sub: "Follow the sharpest wallets on Polymarket and mirror their positions in real time.",
  },
  "Paper Trading": {
    headline: "Paper Trading is Pro-only.",
    sub: "Practice with $100k virtual balance, zero risk — and build a strategy that actually wins.",
  },
};

export function GatedScreen({ featureName }: { featureName: string }) {
  const [loading, setLoading] = useState(false);
  const { headline, sub } = COPY[featureName] ?? {
    headline: `${featureName} is Pro-only.`,
    sub: `Unlock ${featureName} and every other Polykit tool for one flat price.`,
  };

  async function handleCheckout() {
    try {
      setLoading(true);
      if (typeof window !== "undefined") localStorage.setItem("ps_checkout_started", "1");
      const cancelPath = typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/dashboard";
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelPath }),
      });
      const data = (await res.json()) as { url?: string };
      if (data?.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[70vh] overflow-hidden rounded-2xl">
      {/* ── Blurred fake content behind ── */}
      <div className="pointer-events-none select-none blur-sm opacity-60 p-6 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-40 rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-9 w-32 rounded-xl bg-blue-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {["Portfolio", "P&L", "Cash"].map((l) => (
            <div key={l} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-400 mb-2">{l}</div>
              <div className="h-6 w-24 rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {FAKE_ROWS.map((r, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="h-10 w-10 rounded-full bg-blue-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 rounded bg-gray-200" style={{ width: r.w }} />
                <div className="h-3 w-20 rounded bg-gray-100" />
              </div>
              <div
                className="rounded-full px-2 py-0.5 text-xs font-bold"
                style={{
                  backgroundColor: r.green ? "rgba(27,149,80,0.12)" : "rgba(230,72,0,0.10)",
                  color: r.green ? "rgb(27,149,80)" : "rgb(230,72,0)",
                }}
              >
                {r.tag}
              </div>
              <div
                className="text-sm font-semibold w-24 text-right"
                style={{ color: r.green ? "rgb(27,149,80)" : "rgb(230,72,0)" }}
              >
                {r.pnl}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Frosted overlay ── */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.88) 45%, rgba(255,255,255,0.96) 100%)" }}
      >
        <div className="mx-auto max-w-sm w-full px-6 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "rgb(20,24,31)", letterSpacing: "-0.02em" }}>
            {headline}
          </h2>
          <p className="mt-2 text-sm" style={{ color: "rgb(107,114,128)", lineHeight: "1.55" }}>
            {sub}
          </p>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="btn-primary btn-primary-md mt-5"
            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Redirecting…" : "Get My Winning Edge!"}
          </button>
          <p className="mt-3 text-[11px]" style={{ color: "rgb(156,163,175)" }}>
            Cancel anytime · Instant access · Secure checkout
          </p>
        </div>
      </div>
    </div>
  );
}
