"use client";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function ProfitCalculator() {
  const { openAuth } = useAuth();
  const [avg, setAvg] = useState(100);
  const [picks, setPicks] = useState(100);
  const profit = avg * picks;
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-4xl font-extrabold tracking-tight md:text-6xl">Calculate your monthly profit</h2>
      <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm md:p-10">
        <Row label="Average profit per winning bet" value={`$${avg}`} valueRight>
          <Slider value={avg} onChange={setAvg} max={1000} step={10}
            marks={["$0","$200","$400","$600","$800","$1000+"]} />
        </Row>

        <div className="my-8 h-px bg-slate-100" />

        <Row label="Winning AI picks per month" value={`${picks}`}>
          <Slider value={picks} onChange={setPicks} max={1000} step={5}
            marks={["0","200","400","600","800","1000+"]} />
        </Row>

        <div className="my-8 h-px bg-slate-100" />

        <div className="flex items-center justify-center gap-3 text-center text-3xl font-semibold md:text-4xl">
          <span>Monthly profit:</span>
          <span className="rounded-xl bg-[#dcfce7] px-4 py-1 font-bold text-[#166534]">${profit.toLocaleString()}</span>
        </div>

        <button onClick={openAuth} className="btn-primary btn-primary-sm mt-8 w-full">
          Claim your profit now <span>→</span>
        </button>
      </div>
    </section>
  );
}

function Row({ label, value, valueRight, children }: { label: string; value: string; valueRight?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className={`flex items-center gap-3 ${valueRight ? "" : "flex-row-reverse justify-end"}`}>
        <div className="text-xl font-semibold md:text-2xl">{label}</div>
        <div className="rounded-lg bg-[#dbeafe] px-3 py-1 text-xl font-bold text-[#1e3a8a]">{value}</div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Slider({ value, onChange, max, step, marks }: { value: number; onChange: (n: number) => void; max: number; step: number; marks: string[] }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-slate-200">
        <div className="absolute inset-y-0 left-0 rounded-full bg-[#235ae9]" style={{ width: `${pct}%` }} />
        <input type="range" min={0} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent opacity-0" />
        <span className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#235ae9] bg-white shadow" style={{ left: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        {marks.map(m => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}
