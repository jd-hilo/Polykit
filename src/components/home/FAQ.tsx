"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

const ITEMS = [
  { q: "Does it actually work?", a: "Yes. Our AI analyzes thousands of markets daily to surface bets with measurable edge. Users have collectively won over $7.3M using Polykit." },
  { q: "What makes Polykit better than doing my own research?", a: "Speed and breadth. Polykit pulls live news, on-chain wallet data, historical odds and sentiment in seconds — research that would take a human hours." },
  { q: "Which platforms does Polykit work with?", a: "Polymarket, Kalshi, PredictIt, and other major prediction markets." },
  { q: "How fast is the analysis?", a: "Under 8 seconds from screenshot upload to full verdict with confidence score, edge calc, and exit plan." },
  { q: "Do I need experience with prediction markets?", a: "No. Polykit explains each pick in plain English and walks you through every step." },
  { q: "Is my money safe?", a: "Polykit never touches your money or wallet. You execute trades yourself on your preferred platform." },
  { q: "How much does it cost?", a: "$39/month with 30% off. Includes everything — unlimited AI analysis, daily picks, copy trading, and more." },
  { q: "How can I cancel my subscription?", a: "Two clicks in your dashboard. No phone calls, no retention emails, no hassle." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const { openAuth } = useAuth();
  return (
    <section id="faqs" className="mx-auto max-w-3xl px-4 pt-10 pb-16">
      <h2 className="text-center text-4xl font-extrabold tracking-tight md:text-6xl">Got Questions? We Got Answers.</h2>
      <div className="mt-12 space-y-3">
        {ITEMS.map((it, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
                <span className="text-[15px] font-medium">{it.q}</span>
                <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && <div className="px-5 pb-5 text-sm text-muted-foreground">{it.a}</div>}
            </div>
          );
        })}

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <div>
            <div className="text-lg font-bold">Ready to start winning?</div>
            <div className="text-sm text-muted-foreground">Stop guessing. Start winning.</div>
          </div>
          <button onClick={openAuth} className="btn-primary btn-primary-md shrink-0">
            Start winning today <span>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
