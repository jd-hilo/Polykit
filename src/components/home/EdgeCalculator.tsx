"use client";
import { useState } from "react";
import { StartCta } from "@/components/auth/StartCta";

/**
 * "What is an edge worth?" — same two-slider, one-number shape as the old
 * profit calculator, but the math is expectation on the visitor's own
 * assumptions (a $100 stake per market is stated, not hidden), and it never
 * promises results. The old version multiplied "profit per winning bet" by
 * "winning picks per month", which is an earnings claim we can't stand behind.
 */
export function EdgeCalculator() {
  const [edge, setEdge] = useState(4);
  const [markets, setMarkets] = useState(10);

  // On a $100 stake, one cent of edge ≈ $1 of expected value.
  const ev = edge * markets;

  return (
    <section className="mx-auto max-w-3xl text-center">
      <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[#0d0d0d] md:text-4xl">
        What is an edge worth?
      </h2>
      <p className="mx-auto mt-3 text-[15px] text-[#737373]">
        $100 stake per market · your assumptions
      </p>

      <div className="mt-10 rounded-3xl border border-[#e3e3e3] bg-white p-6 text-left shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:p-10">
        <Row label="Edge when you act" value={`${edge}¢`}>
          <Slider value={edge} onChange={setEdge} min={1} max={15} step={1} marks={["1¢", "5¢", "10¢", "15¢"]} />
        </Row>

        <div className="my-8 h-px bg-[#f0f0f0]" />

        <Row label="Markets you act on per month" value={`${markets}`}>
          <Slider value={markets} onChange={setMarkets} min={1} max={30} step={1} marks={["1", "10", "20", "30"]} />
        </Row>

        <div className="my-8 h-px bg-[#f0f0f0]" />

        <div className="flex flex-wrap items-center justify-center gap-3 text-center text-2xl font-semibold md:text-3xl">
          <span className="text-[#0d0d0d]">Expected value:</span>
          <span className="rounded-xl bg-[#dcfce7] px-4 py-1 font-bold tabular-nums text-[#166534]">
            ${ev}/mo
          </span>
          <span className="text-[15px] font-normal text-[#737373]">vs $14/mo for Polykit</span>
        </div>

        <div className="mt-8 flex justify-center">
          <StartCta location="edge_calculator" label="Connect Polykit" className="btn-primary btn-primary-md" showArrow />
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-[#a3a3a3]">
          Straight expectation math on your inputs — not a projection of results. Edges are
          estimates, variance is real, and most markets deserve a PASS.
        </p>
      </div>
    </section>
  );
}

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-semibold text-[#0d0d0d] md:text-xl">{label}</div>
        <div className="rounded-lg bg-[#eff6ff] px-3 py-1 font-display text-xl font-bold tabular-nums text-[#006fff]">
          {value}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Slider({
  value,
  onChange,
  min,
  max,
  step,
  marks,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  marks: string[];
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="relative h-2 rounded-full bg-[#eceff3]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#0080ff] to-[#5f61ed]"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label="slider"
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent opacity-0"
        />
        <span
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#006fff] bg-white shadow-md"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-[#a3a3a3]">
        {marks.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}
