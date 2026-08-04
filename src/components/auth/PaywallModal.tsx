"use client";
import { useState } from "react";
import { Modal } from "./Modal";
import { analytics } from "@/lib/analytics";

const FEATURES: [string, string][] = [
  ["Polykit MCP Server", "Streamable HTTP at /api/mcp"],
  ["analyze_market Tool", "URL, slug, or screenshot → edge analysis"],
  ["Connection key", "Lets Claude and ChatGPT call Polykit"],
  ["Usage Dashboard", "track every MCP call from your dashboard"],
];


export function PaywallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    try {
      setLoading(true);
      analytics.checkoutStarted("paywall_modal");
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

  function handleClose() {
    analytics.paywallDismissed("initial");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} className="max-w-md border-2 border-[#bfdbfe] bg-[#eff6ff] p-3 md:p-4">
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
            <div className="text-3xl font-extrabold tracking-tight">MCP Access</div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Connect Claude and ChatGPT to Polykit&apos;s Polymarket analysis MCP.</p>

          {/* Price */}
          <div className="mt-5 flex items-end gap-3">
            <span className="text-4xl font-extrabold">$14</span>
            <span className="text-2xl font-semibold text-muted-foreground">/month</span>
            <span className="mb-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-xs font-semibold text-[#166534]">first month $1</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Cancel anytime. Full access from day one.</p>

          {/* CTA */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="btn-primary btn-primary-md mt-6 w-full"
          >
            {loading ? "Redirecting…" : "Add Polykit to Claude →"}
          </button>

          <div className="mt-5 flex items-center justify-center gap-5 text-[12px] text-muted-foreground">
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
