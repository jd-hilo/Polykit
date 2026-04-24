import Link from "next/link";

type Col = { h: string; d: React.ReactNode; cta: string; href: string };
type Feature = {
  id: string;
  bg: string; border: string; head: string; body: string; sub: string; btnTone: string;
  title: React.ReactNode; sub2: React.ReactNode;
  left: Col; right: Col;
};

const FEATURES: Feature[] = [
  {
    id: "analyzer",
    bg: "bg-[#dbeafe]", border: "border-[#60a5fa]",
    head: "text-[#1e3a8a]", sub: "text-[#1e3a8a]/80", body: "text-[#1e3a8a]/75", btnTone: "btn-feature-blue",
    title: <>Screenshot any market. Get your edge instantly.</>,
    sub2: <>Drop a screenshot of any prediction market and let AI do the heavy lifting — <em>no research required.</em></>,
    left: { h: "Scan any bet from any platform", d: "Polymarket, Kalshi, PredictIt — it doesn't matter. Just screenshot the market you're looking at. Our AI identifies the bet, pulls the latest data, and delivers a clear verdict.", cta: "Try the Analyzer", href: "/dashboard/ai-analyzer" },
    right: { h: "Get confidence scores, risks & exit plans", d: "Every analysis includes a confidence rating, edge calculation, key risks, and a full exit strategy — so you always know exactly when to enter and when to walk away.", cta: "Try the Analyzer", href: "/dashboard/ai-analyzer" },
  },
  {
    id: "copy",
    bg: "bg-[#fce7f3]", border: "border-[#f9a8d4]",
    head: "text-[#831843]", sub: "text-[#831843]/80", body: "text-[#831843]/75", btnTone: "btn-feature-pink",
    title: <>Copy trade the sharpest wallets — automatically.</>,
    sub2: <>Connect your API keys, pick a trader, and let the bot <em>mirror every move in real time.</em></>,
    left: { h: "Fully automated execution", d: "Select any top trader and set your budget. The system places the same trades they do — same markets, same timing, scaled to your size.", cta: "Start Copy Trading", href: "/dashboard" },
    right: { h: "Full control, zero guesswork", d: "Set your own budget, trade size, and risk limits. Pause or stop any time — you stay in control while the bot does the work.", cta: "See How It Works", href: "/dashboard" },
  },
  {
    id: "paper",
    bg: "bg-[#fef3c7]", border: "border-[#fcd34d]",
    head: "text-[#78350f]", sub: "text-[#78350f]/80", body: "text-[#78350f]/75", btnTone: "btn-feature-amber",
    title: <>Practice risk-free with paper trading.</>,
    sub2: <>Test your strategies with virtual money before risking real funds — <em>learn what works without the downside.</em></>,
    left: { h: "Simulate real trades", d: "Place bets on any Polymarket event with a virtual balance. Track your positions, P&L, and win rate — just like the real thing.", cta: "Start Paper Trading", href: "/dashboard/positions" },
    right: { h: "Track your performance", d: "See your full trade history, monitor open positions in real time, and measure your edge before going live with real money.", cta: "View Positions", href: "/dashboard/positions" },
  },
];

function TradeStrategiesCard() {
  return (
    <div
      className="relative w-full overflow-hidden bg-white"
      style={{
        borderRadius: 24,
        border: "2px solid rgba(76,178,255,0.6)",
        boxShadow: "rgba(0,0,0,0.06) 0px 2px 8px 0px, rgba(35,90,233,0.08) 0px 0px 25px 0px inset",
      }}
    >
      {/* Tinted top strip with dot pattern */}
      <div className="relative" style={{ height: 96, background: "linear-gradient(180deg, #ede9fe 0%, #ffffff 100%)" }}>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(100,116,139,0.25) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
            WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
            maskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Icon centered on strip boundary */}
      <div className="relative -mt-6 flex justify-center">
        <div
          className="flex items-center justify-center rounded-2xl shadow-sm overflow-hidden"
          style={{ width: 48, height: 48, backgroundColor: "rgba(139,92,246,0.15)", border: "1px solid rgba(255,255,255,0.7)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Polykit" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </div>

      {/* Text + CTA */}
      <div className="px-8 pb-8 pt-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "rgb(20,24,31)" }}>
            Trade Strategies
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgb(109,40,217)", padding: "2px 8px", borderRadius: 99, backgroundColor: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)" }}>
            Coming Soon
          </span>
        </div>
        <p className="mx-auto mt-1 max-w-xl text-muted-foreground" style={{ fontSize: 15, lineHeight: "22px" }}>
          Copy expert strategies built by top Polymarket traders and let the system execute them automatically — zero manual work required.
        </p>

        <div className="mx-auto mt-8 grid max-w-2xl gap-6 text-left md:grid-cols-2">
          {[
            { h: "Plug-and-play strategies", d: "Browse strategies ranked by ROI, win rate, and risk. Activate in one click." },
            { h: "Set it and forget it", d: "The system monitors markets 24/7 and places trades sized to your budget." },
          ].map((c, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div style={{ fontSize: 15, fontWeight: 700, color: "rgb(20,24,31)", marginBottom: 6 }}>{c.h}</div>
              <p style={{ fontSize: 13, lineHeight: "19px", color: "rgb(107,114,128)" }}>{c.d}</p>
            </div>
          ))}
        </div>

        <a href="#pricing" className="btn-primary btn-primary-sm mt-6 inline-flex">
          Join Waitlist →
        </a>
      </div>
    </div>
  );
}

export function FeatureCards() {
  return (
    <section id="features" className="mx-auto max-w-6xl space-y-10 px-4 py-6">
      {FEATURES.map(f => (
        <div key={f.id} className={`rounded-[28px] border-2 ${f.border} ${f.bg} p-8 md:p-12`}>
          <h3 className={`max-w-3xl text-3xl font-extrabold tracking-tight md:text-4xl ${f.head}`}>{f.title}</h3>
          <p className={`mt-3 max-w-2xl ${f.sub}`}>{f.sub2}</p>
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            {[f.left, f.right].map((c, i) => (
              <div key={i}>
                <div className={`text-lg font-bold ${f.head}`}>{c.h}</div>
                <p className={`mt-3 text-[15px] leading-relaxed ${f.body}`}>{c.d}</p>
                <Link href={c.href} className={`btn-feature ${f.btnTone} mt-5`}>
                  {c.cta} <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}
      <TradeStrategiesCard />
    </section>
  );
}
