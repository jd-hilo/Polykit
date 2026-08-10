"use client";
import { StartCta } from "@/components/auth/StartCta";
import { EdgeCalculator } from "@/components/home/EdgeCalculator";
import { ScanSearch, Cpu, Shield } from "lucide-react";

const FEATURES = [
  {
    icon: ScanSearch,
    title: "Know if a market is worth it",
    desc: "Link or screenshot in — fair value, edge, and a clear call out.",
  },
  {
    icon: Cpu,
    title: "Best line on multi-outcome events",
    desc: "Every option scored. The biggest edge named.",
  },
  {
    icon: Shield,
    title: "Never leave the chat",
    desc: "Connect once. Ask Claude or ChatGPT anything.",
  },
];

const PROOF = [
  { value: "<10s", label: "To a clear verdict" },
  { value: "Any market", label: "Link or screenshot" },
  { value: "2 apps", label: "Claude & ChatGPT" },
  { value: "2 min", label: "To connect" },
];

export function McpFeatures() {
  return (
    <section id="features" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid grid-cols-2 gap-4 overflow-hidden rounded-2xl border border-[#e3e3e3] bg-[#f7f7f7] px-4 py-6 sm:grid-cols-4 sm:px-8">
          {PROOF.map((p) => (
            <div key={p.label} className="text-center">
              <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#0d0d0d] md:text-3xl">
                {p.value}
              </p>
              <p className="mt-1 text-[12px] font-medium uppercase tracking-wide text-[#a3a3a3]">
                {p.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <EdgeCalculator />
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-[#e3e3e3] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:border-[#78d2ff] hover:shadow-[0_12px_40px_rgba(0,128,255,0.1)] md:p-7"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0080ff] to-[#5f61ed] text-white shadow-md shadow-[#0080ff]/25">
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-semibold tracking-[-0.01em] text-[#0d0d0d]">
                  {f.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#525252]">{f.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="relative mt-12 overflow-hidden rounded-2xl">
          <div aria-hidden className="supaste-banner absolute inset-0" />
          <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4 md:px-6">
            <p className="text-[15px] font-semibold text-white md:text-[16px]">
              Unlimited analysis
              <span className="font-normal text-white/80"> · Cancel anytime</span>
            </p>
            <StartCta location="features_cta" label="Connect Polykit" className="btn-hero shrink-0" showArrow onDark />
          </div>
        </div>
      </div>
    </section>
  );
}
