"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { StartCta } from "@/components/auth/StartCta";

const ITEMS = [
  {
    q: "How fast can I start?",
    a: "About two minutes. Subscribe, create an API key, paste the connector into Claude or ChatGPT, and ask it to analyze a Polymarket link.",
  },
  {
    q: "What do I actually get on each analysis?",
    a: "Fair value vs live price, your edge, confidence, a BUY/SELL/PASS call, three reasons, and key risks. Works on single markets and multi-outcome events.",
  },
  {
    q: "Does it work with Claude and ChatGPT?",
    a: "Yes. Claude Desktop, Claude.ai, ChatGPT connectors, Cursor, and any client that supports remote MCP with a Bearer token.",
  },
  {
    q: "Can I send a screenshot?",
    a: "Yes. Send a screenshot, or paste the Polymarket URL for the most reliable match.",
  },
  {
    q: "How does billing work?",
    a: "Polykit is $14/month, cancel anytime before renewal. Your first month is $1 so you can try the full product. Full access from day one.",
  },
  {
    q: "Is Polykit affiliated with Polymarket?",
    a: "No. Independent third-party tool. We use public market data. We never execute trades or hold funds.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faqs" className="border-t border-[#e3e3e3] bg-[#f7f7f7] py-20 md:py-28">
      <div className="mx-auto max-w-2xl px-6 md:px-10">
        <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[#0d0d0d] md:text-4xl">
          Common questions
        </h2>
        <div className="mt-10 divide-y divide-[#e3e3e3] overflow-hidden rounded-2xl border border-[#e3e3e3] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          {ITEMS.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                >
                  <span className="text-[15px] font-medium text-[#0d0d0d]">{it.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-[#a3a3a3] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-[14px] leading-relaxed text-[#525252]">{it.a}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="relative mt-14 overflow-hidden rounded-2xl">
          <div aria-hidden className="supaste-banner absolute inset-0" />
          <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4 md:px-6">
            <p className="text-[15px] font-semibold text-white md:text-[16px]">
              Put an edge inside Claude and ChatGPT
              <span className="font-normal text-white/80">
                {" "}
                · Instant access · Cancel anytime
              </span>
            </p>
            <StartCta location="faq_close" label="Add Polykit to Claude" className="btn-hero shrink-0" showArrow onDark />
          </div>
        </div>
      </div>
    </section>
  );
}
