"use client";
import { useEffect, useState } from "react";
import { Modal } from "./Modal";

const INITIAL_SECONDS = 10 * 60;

const FEATURES: [string, string][] = [
  ["Instant Full Access", "to the full Polykit platform"],
  ["AI Market Analyzer", "screenshot any market for instant edge analysis"],
  ["Paper Trading", "simulate with $100k virtual balance"],
  ["AI Coach", "live-cited strategy advice with specific picks"],
];


export function PaywallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [remaining, setRemaining] = useState(INITIAL_SECONDS);
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    try {
      setLoading(true);
      const cancelPath = typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/dashboard";
      if (typeof window !== "undefined") localStorage.setItem("ps_checkout_started", "1");
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

  useEffect(() => {
    if (!open) return;
    setRemaining(INITIAL_SECONDS);
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [open]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <Modal open={open} onClose={onClose} className="max-w-md border-2 border-[#bfdbfe] bg-[#eff6ff] p-3 md:p-4">
      <div className="space-y-4">
        {/* Top card */}
        <div className="rounded-[24px] bg-white p-7">
          {/* Title */}
          <div className="mt-4 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#235ae9] text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" />
              </svg>
            </span>
            <div className="text-3xl font-extrabold tracking-tight">All-Access</div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">You&apos;re getting instant access to the complete Polykit platform.</p>

          {/* Price */}
          <div className="mt-5 flex items-end gap-3">
            <span className="text-4xl font-extrabold">$1</span>
            <span className="text-2xl font-semibold text-muted-foreground">first month</span>
            <span className="mb-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-xs font-semibold text-[#166534]">then $39/mo</span>
          </div>

          {/* Countdown */}
          <div className="mt-4 flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 w-fit">
            <span className="text-[13px]">🔥</span>
            <span className="text-[13px] font-medium text-orange-700">Offer expires in</span>
            <span className="font-mono text-[13px] font-bold tabular-nums text-orange-700">00:{mm}:{ss}</span>
          </div>

          {/* CTA */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="btn-primary btn-primary-md mt-6 w-full"
          >
            {loading ? "Redirecting…" : "Claim Now! →"}
          </button>

          {/* Trust row */}
          <div className="mt-5 flex items-center justify-center gap-3 text-xs">
            <TrustpilotStars /> <span className="font-medium">4.9/5</span>
            <span className="text-muted-foreground">|</span>
            <span className="inline-flex items-center gap-1.5 text-[#235ae9]"><Verified /> verified by Proof</span>
          </div>
          <div className="mt-4 flex items-center justify-center gap-5 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CheckIcon small /> Instant access</span>
            <span className="inline-flex items-center gap-1"><CheckIcon small /> Cancel anytime</span>
            <span className="inline-flex items-center gap-1"><CheckIcon small /> Secure checkout</span>
          </div>
        </div>

        {/* Features card */}
        <div className="rounded-[24px] border border-[#bfdbfe] bg-white p-7">
          <ul className="space-y-3 text-[15px]">
            {FEATURES.map(([k, v]) => (
              <li key={k} className="flex items-start gap-3">
                <CheckIcon />
                <div>
                  <span className="font-semibold text-[#235ae9] underline decoration-[#bfdbfe] decoration-2 underline-offset-4">{k}</span>
                  <span className="text-foreground/80"> {v}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
        >
          I&apos;ll get it later
        </button>
      </div>
    </Modal>
  );
}

function CheckIcon({ small }: { small?: boolean }) {
  const s = small ? 12 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#235ae9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function TrustpilotStars() {
  return (
    <div className="flex items-center gap-[2px] rounded bg-[#00b67a] px-1.5 py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z"/></svg>
      ))}
    </div>
  );
}
function Verified() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}
