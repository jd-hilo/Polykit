import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative mt-16 bg-[#235ae9] text-white">
      <div aria-hidden className="absolute -top-16 left-0 right-0 h-16 bg-[#235ae9]" style={{
        clipPath: "ellipse(60% 100% at 50% 100%)"
      }} />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <img src="/logo.png" alt="Polykit" className="h-8 w-8 rounded-lg" />
            <span>Polykit</span>
          </Link>
          <p className="max-w-xs text-sm text-white/80">AI-powered prediction market tools for smarter trading on Polymarket.</p>
        </div>
        <Col title="FEATURES" items={[["AI Analyzer","/dashboard/ai-analyzer"],["Paper Trading","/dashboard/positions"],["Wallet Tracker","/dashboard/wallet-tracker"],["AI Coach","/dashboard/ai-coach"]]} />
        <Col title="TOOLS" items={[["Paper Trading","/dashboard/positions"],["Wallet Tracker","/dashboard/wallet-tracker"],["Trading Blueprint","/dashboard"],["Dashboard","/dashboard"]]} />
        <Col title="COMPANY" items={[["Blog","/blog"],["Pricing","/pricing"],["Terms","/terms"],["Privacy","/privacy"]]} />
      </div>
      <div className="relative border-t border-white/10 py-5 text-center text-xs text-white/70">© {new Date().getFullYear()} Polykit. Not affiliated with Polymarket or Kalshi.</div>
    </footer>
  );
}

function Col({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <div className="mb-3 text-xs font-bold tracking-widest text-white/70">{title}</div>
      <ul className="space-y-2 text-sm">
        {items.map(([l, h]) => <li key={l}><Link href={h} className="text-white/85 hover:text-white">{l}</Link></li>)}
      </ul>
    </div>
  );
}
