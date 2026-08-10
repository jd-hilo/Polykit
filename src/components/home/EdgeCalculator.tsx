"use client";
import { Fragment, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * "What is an edge worth?" — visually a faithful rebuild of the original
 * profit calculator (grey shell, stacked white cards, inline value pills,
 * dash-connected slider marks, big green result, full-width CTA). The words
 * are the honest version: the old one multiplied "profit per winning bet" by
 * "winning picks per month" and said "claim your profit now", which is an
 * earnings claim we can't stand behind. This is expectation math on a stated
 * $100 stake from the visitor's own assumptions.
 */
export function EdgeCalculator() {
  const { openAuth } = useAuth();
  const [edge, setEdge] = useState(4);
  const [markets, setMarkets] = useState(10);

  // On a $100 stake, one cent of edge ≈ $1 of expected value.
  const ev = edge * markets;

  return (
    <section className="mx-auto max-w-3xl">
      <h2 className="text-4xl font-extrabold tracking-tight text-[#0d0d0d] md:text-6xl">
        What is an edge worth?
      </h2>
      <p className="mt-3 text-[15px] text-[#737373]">
        $100 stake per market · your assumptions
      </p>

      <div className="mt-10 rounded-[32px] border border-[#ececec] bg-[#f7f7f7] p-2.5 md:p-3">
        {/* Row 1 — label left, pill right */}
        <div className="rounded-[26px] bg-white px-6 py-7 shadow-[0_2px_10px_rgba(0,0,0,0.03)] md:px-10 md:py-8">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
            <span className="text-xl font-semibold text-[#0d0d0d] md:text-2xl">
              Edge per market
            </span>
            <span className="rounded-xl bg-[#eff6ff] px-4 py-1 text-2xl font-bold tabular-nums text-[#2563eb] md:text-3xl">
              {edge}¢
            </span>
          </div>
          <div className="mt-6">
            <Slider value={edge} onChange={setEdge} min={1} max={15} step={1} marks={["1¢", "5¢", "10¢", "15¢"]} />
          </div>
        </div>

        {/* Row 2 — pill left, label right */}
        <div className="mt-2.5 rounded-[26px] bg-white px-6 py-7 shadow-[0_2px_10px_rgba(0,0,0,0.03)] md:px-10 md:py-8">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
            <span className="rounded-xl bg-[#eff6ff] px-4 py-1 text-2xl font-bold tabular-nums text-[#2563eb] md:text-3xl">
              {markets}
            </span>
            <span className="text-xl font-semibold text-[#0d0d0d] md:text-2xl">
              Markets you act on per month
            </span>
          </div>
          <div className="mt-6">
            <Slider value={markets} onChange={setMarkets} min={1} max={30} step={1} marks={["1", "10", "20", "30"]} />
          </div>
        </div>

        {/* Row 3 — result + CTA */}
        <div className="mt-2.5 rounded-[26px] bg-white px-6 py-7 shadow-[0_2px_10px_rgba(0,0,0,0.03)] md:px-10 md:py-8">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-3xl font-semibold md:text-4xl">
            <span className="text-[#0d0d0d]">Expected value:</span>
            <span className="rounded-2xl bg-[#dcfce7] px-5 py-1 font-bold tabular-nums text-[#166534]">
              ${ev.toLocaleString()}/mo
            </span>
          </div>

          <button
            type="button"
            onClick={() => openAuth("edge_calculator")}
            className="btn-primary btn-primary-md mt-7 w-full"
          >
            Connect Polykit for $14/mo <span>→</span>
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-[#a3a3a3]">
            Straight expectation math on your inputs — not a projection of results. Edges are
            estimates, variance is real, and most markets deserve a PASS.
          </p>
        </div>
      </div>
    </section>
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
      <div className="relative h-2 rounded-full bg-[#e4e4e7]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#3b82f6]"
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
          className="pointer-events-none absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-3 flex items-center text-[13px] font-semibold text-[#3f3f46]">
        {marks.map((m, i) => (
          <Fragment key={m}>
            {i > 0 && <span className="mx-2.5 h-px flex-1 bg-[#e4e4e7]" />}
            <span>{m}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
