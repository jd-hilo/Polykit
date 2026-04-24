const STEPS = [
  { t: "Upload Screenshot", d: "Drop a screenshot of any market." },
  { t: "AI Analyzes", d: "Our AI scans news & data for your edge." },
  { t: "Get Your Pick", d: "Get a clear pick. Place your bet." },
];

export function ThreeStep() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-8 pb-16 text-center md:pt-16">
      <h2 className="text-4xl font-extrabold tracking-tight md:text-6xl">Screenshot. Analyze. Win.</h2>
      <p className="mx-auto mt-4 text-muted-foreground md:text-lg">In just three simple steps, start making smarter bets.</p>
      <div className="mt-12 space-y-6">
        {STEPS.map((s, i) => (
          <div key={s.t} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-24 bg-gradient-to-b from-[#dbeafe] to-white">
              <div aria-hidden className="h-full w-full" style={{
                backgroundImage: "radial-gradient(circle, rgba(59,130,246,0.2) 1px, transparent 1px)",
                backgroundSize: "12px 12px",
                maskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
              }} />
            </div>
            <div className="relative -mt-5 flex justify-center">
              <span className="rounded-full bg-gradient-to-b from-[#fb923c] to-[#f97316] px-5 py-1.5 text-sm font-semibold text-white shadow-md">
                Step {i + 1}
              </span>
            </div>
            <div className="px-6 pb-10 pt-5 text-center">
              <div className="text-2xl font-bold">{s.t}</div>
              <p className="mt-2 text-muted-foreground">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
