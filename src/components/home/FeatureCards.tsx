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
    id: "picks",
    bg: "bg-[#dcfce7]", border: "border-[#86efac]",
    head: "text-[#14532d]", sub: "text-[#14532d]/80", body: "text-[#14532d]/75", btnTone: "btn-feature-green",
    title: <>Daily picks from traders who actually win.</>,
    sub2: <>Curated bets handpicked by top traders — so you can skip the noise and <em>bet with confidence.</em></>,
    left: { h: "Expert-curated bets, updated daily", d: "Our team reviews hundreds of markets every day and surfaces only the highest-conviction plays. No guesswork — just proven picks backed by real analysis.", cta: "See Today's Picks", href: "/dashboard/picks" },
    right: { h: "Know exactly what to bet and when", d: "Every pick comes with a clear recommendation, entry price, and reasoning — so you can place your bet in seconds and move on with your day.", cta: "See Today's Picks", href: "/dashboard/picks" },
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
    </section>
  );
}
