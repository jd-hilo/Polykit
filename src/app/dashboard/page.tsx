"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ScanSearch,
  FlaskConical,
  Users,
  Wallet,
  MessageCircle,
  ArrowRight,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ─── Data ───────────────────────────────────────────────── */

type CardSpec = {
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  topTint: string;
};

const FEATURE_CARDS: CardSpec[] = [
  {
    title: "AI Market Analyzer",
    subtitle: "Upload a screenshot of any market and get an instant AI-powered prediction.",
    href: "/dashboard/ai-analyzer",
    icon: ScanSearch,
    iconBg: "rgba(99,102,241,0.12)",
    iconColor: "rgb(99,102,241)",
    topTint: "#dbeafe",
  },
  {
    title: "Paper Trading",
    subtitle: "Trade with virtual money and test strategies without any risk.",
    href: "/dashboard/positions",
    icon: FlaskConical,
    iconBg: "rgba(249,115,22,0.12)",
    iconColor: "rgb(249,115,22)",
    topTint: "#ffedd5",
  },
  {
    title: "Wallet Tracker",
    subtitle: "Track what the sharpest wallets are buying in real time.",
    href: "/dashboard/wallet-tracker",
    icon: Wallet,
    iconBg: "rgba(20,184,166,0.15)",
    iconColor: "rgb(20,184,166)",
    topTint: "#ccfbf1",
  },
  {
    title: "AI Coach",
    subtitle: "Get personalized strategy advice and sharpen your edge with AI coaching.",
    href: "/dashboard/ai-coach",
    icon: MessageCircle,
    iconBg: "rgba(139,92,246,0.15)",
    iconColor: "rgb(139,92,246)",
    topTint: "#ede9fe",
  },
];

/* ─── Card ───────────────────────────────────────────────── */

function GridCard({ card, minHeight }: { card: CardSpec; minHeight: number }) {
  const Icon = card.icon;
  return (
    <Link
      href={card.href}
      className="group relative block overflow-hidden bg-white transition hover:-translate-y-0.5 hover:shadow-md"
      style={{
        borderRadius: 24,
        border: "2px solid rgba(76,178,255,0.6)",
        boxShadow:
          "rgba(0,0,0,0.06) 0px 2px 8px 0px, rgba(35,90,233,0.08) 0px 0px 25px 0px inset",
        minHeight,
      }}
    >
      <div
        className="relative"
        style={{
          height: 96,
          background: `linear-gradient(180deg, ${card.topTint} 0%, #ffffff 100%)`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(100,116,139,0.25) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
            WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
            maskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative -mt-6 flex justify-center">
        <div
          className="flex items-center justify-center rounded-2xl shadow-sm"
          style={{
            width: 48,
            height: 48,
            backgroundColor: card.iconBg,
            border: "1px solid rgba(255,255,255,0.7)",
            backdropFilter: "blur(2px)",
          }}
        >
          <Icon size={22} style={{ color: card.iconColor }} />
        </div>
      </div>

      <div className="px-5 pb-6 pt-3 text-center">
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "rgb(20,24,31)",
          }}
        >
          {card.title}
        </div>
        <p
          className="mx-auto mt-1.5 max-w-sm"
          style={{
            fontSize: 13,
            lineHeight: "18px",
            color: "rgb(107,114,128)",
          }}
        >
          {card.subtitle}
        </p>
      </div>
    </Link>
  );
}

/* ─── Waitlist Modal ─────────────────────────────────────── */

function WaitlistModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, feature: "trade-strategies" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Failed to join waitlist");
        return;
      }
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 384,
          backgroundColor: "rgb(255,255,255)",
          borderRadius: 16,
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.04)",
          padding: 24,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            color: "rgb(107,114,128)",
            cursor: "pointer",
            borderRadius: 8,
          }}
        >
          <X size={16} />
        </button>

        {success ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "rgb(20,24,31)", marginBottom: 6 }}>
              You&apos;re on the list!
            </div>
            <div style={{ fontSize: 13, color: "rgb(107,114,128)" }}>
              We&apos;ll email you when it launches.
            </div>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "rgb(20,24,31)", marginBottom: 4 }}>
              Join the Waitlist
            </h3>
            <p style={{ fontSize: 13, color: "rgb(107,114,128)", marginBottom: 16 }}>
              Be first to know when Trade Strategies launches.
            </p>
            <form onSubmit={submit}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  color: "rgb(20,24,31)",
                  backgroundColor: "rgb(255,255,255)",
                  border: "1px solid rgba(229,231,235,0.8)",
                  borderRadius: 10,
                  outline: "none",
                  marginBottom: 12,
                  fontFamily: "inherit",
                }}
              />
              {error && (
                <div
                  style={{
                    padding: "8px 12px",
                    fontSize: 12,
                    color: "rgb(153,27,27)",
                    backgroundColor: "rgba(254,226,226,0.6)",
                    border: "1px solid rgba(252,165,165,0.5)",
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "rgb(255,255,255)",
                  backgroundColor: "rgb(36,99,235)",
                  border: "none",
                  borderRadius: 10,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Joining…" : "Join Waitlist"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────── */

export default function DashboardHome() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

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
        <h1 style={{ fontSize: 20, fontWeight: 600, lineHeight: "28px", color: "rgb(20,24,31)", margin: 0 }}>
          Dashboard
        </h1>
      </div>

      {/* 2×2 feature card grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {FEATURE_CARDS.map((card) => (
          <GridCard key={card.title} card={card} minHeight={220} />
        ))}
      </div>

      {/* Trade Strategies banner */}
      <div
        className="group relative mt-4 w-full overflow-hidden bg-white"
        style={{
          borderRadius: 24,
          border: "2px solid rgba(76,178,255,0.6)",
          boxShadow: "rgba(0,0,0,0.06) 0px 2px 8px 0px, rgba(35,90,233,0.08) 0px 0px 25px 0px inset",
        }}
      >
        {/* Tinted top strip with dot pattern */}
        <div
          className="relative"
          style={{ height: 72, background: "linear-gradient(180deg, #ede9fe 0%, #ffffff 100%)" }}
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(100,116,139,0.25) 1px, transparent 1px)",
              backgroundSize: "12px 12px",
              WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
              maskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
            }}
          />
        </div>

        {/* Icon centered on strip boundary */}
        <div className="relative -mt-6 flex justify-center">
          <div
            className="flex items-center justify-center rounded-2xl shadow-sm overflow-hidden"
            style={{
              width: 48, height: 48,
              backgroundColor: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(255,255,255,0.7)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Polykit" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        {/* Text + CTA */}
        <div className="px-5 pb-5 pt-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "rgb(20,24,31)" }}>
              Trade Strategies
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              color: "rgb(109,40,217)", padding: "2px 8px", borderRadius: 99,
              backgroundColor: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)",
            }}>
              Coming Soon
            </span>
          </div>
          <p className="mx-auto mt-1 max-w-sm" style={{ fontSize: 13, lineHeight: "18px", color: "rgb(107,114,128)" }}>
            Copy expert strategies and automate your prediction market edge.
          </p>
          <button
            type="button"
            onClick={() => setWaitlistOpen(true)}
            className="btn-primary btn-primary-sm mt-4"
          >
            <Users size={13} />
            Join Waitlist
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {waitlistOpen && <WaitlistModal onClose={() => setWaitlistOpen(false)} />}
    </div>
  );
}
