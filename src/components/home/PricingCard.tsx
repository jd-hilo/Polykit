"use client";
import { StartCta } from "@/components/auth/StartCta";
import { Check } from "lucide-react";

const FEATURES = [
  "Analyze any Polymarket market from Claude, ChatGPT, or Cursor",
  "Clear BUY / SELL / PASS with fair value and edge",
  "Multi-outcome events scored so you pick the best line",
  "Live news context on every call",
  "API keys and usage tracking in your dashboard",
  "Cancel anytime. No lock-in.",
];

export function PricingCard() {
  return (
    <section id="pricing" className="border-t border-[#e3e3e3] bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[#0d0d0d] md:text-4xl">
            $14 a month. Cancel anytime.
          </h2>
          <p className="mt-3 text-[16px] text-[#525252]">
            One plan, full access from day one across Claude and ChatGPT. No usage limits, no lock-in.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-lg">
          <div className="relative overflow-hidden rounded-[28px] p-[2px] shadow-[0_20px_50px_rgba(0,128,255,0.2)]">
            <div aria-hidden className="supaste-banner absolute inset-0" />
            <div className="relative rounded-[26px] bg-white p-8 md:p-10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="" width={40} height={40} className="rounded-xl" />
                  <div>
                    <div className="text-xl font-bold tracking-tight text-[#0d0d0d]">
                      Full Access
                    </div>
                    <div className="text-sm text-[#737373]">Everything included</div>
                  </div>
                </div>
                <span className="supaste-shimmer rounded-full bg-gradient-to-r from-[#0080ff] to-[#5f61ed] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Best value
                </span>
              </div>

              <div className="mt-6 flex items-end gap-2">
                <span className="font-display text-5xl font-semibold tracking-[-0.03em] text-[#0d0d0d]">
                  $14
                </span>
                <span className="pb-1 text-[#525252]">/month</span>
              </div>
              <p className="mt-1 text-sm text-[#737373]">
                Cancel anytime. <span className="font-medium text-[#0d0d0d]">First month $1.</span>
              </p>

              <StartCta
                location="pricing"
                label="Connect Polykit"
                className="btn-primary btn-primary-lg mt-8 w-full"
                showArrow
              />
              <p className="mt-3 text-center text-[12px] text-[#a3a3a3]">
                Secure checkout. Instant API key. No lock-in.
              </p>

              <ul className="mt-8 space-y-3 border-t border-[#e3e3e3] pt-8 text-left">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[14px] text-[#525252]">
                    <Check size={16} className="mt-0.5 shrink-0 text-[#006fff]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
