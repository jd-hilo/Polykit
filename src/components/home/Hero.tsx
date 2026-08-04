"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { StartCta } from "@/components/auth/StartCta";
import { Zap, Link2, BarChart3 } from "lucide-react";

const MCP_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/mcp`
  : "https://polykit.co/api/mcp";

const HIGHLIGHTS = [
  { icon: Zap, label: "Know the edge before you bet" },
  { icon: Link2, label: "Works inside Claude & ChatGPT" },
  { icon: BarChart3, label: "Verdicts in under 10 seconds" },
];

export function Hero() {
  const { hasAccess } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Blue field only behind the copy — demo sits on clean white */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[72%] min-h-[520px]"
        style={{
          background:
            "linear-gradient(180deg, #190096 0%, #0080ff 42%, #5ebfff 78%, #ffffff 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#9191ff]/35 blur-[90px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-32 h-80 w-80 rounded-full bg-[#78d2ff]/40 blur-[100px]"
      />

      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-32 md:px-10 md:pb-24 md:pt-36">
        <div
          className="mx-auto max-w-3xl text-center transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <h1 className="font-display text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-white">
            Turn your Claude into a Polymarket Expert
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/90">
            Drop a Polymarket link into Claude or ChatGPT. Get a clear verdict on what to buy,
            what to skip, and where the edge is, in seconds.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="supaste-glass--light inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium text-white"
              >
                <Icon size={14} className="text-white" />
                {label}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-3">
            <StartCta
              location="hero"
              label="Add Polykit to Claude"
              className="btn-hero group text-[16px]"
              showArrow
              onDark
            />
            {!hasAccess && (
              <p className="text-[13px] font-medium text-white/90">
                $14/month. Cancel anytime. First month $1.
              </p>
            )}
          </div>
        </div>

        <div
          className="mt-14 transition-all duration-700 delay-100 ease-out lg:mt-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
          }}
        >
          <HeroDemo mcpUrl={MCP_URL} />
        </div>
      </div>
    </section>
  );
}

function HeroDemo({ mcpUrl }: { mcpUrl: string }) {
  const [tab, setTab] = useState<"connect" | "result">("result");

  const snippet = `{
  "mcpServers": {
    "polykit": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer pk_live_…"
      }
    }
  }
}`;

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e3e3e3] bg-white shadow-[0_24px_80px_rgba(0,80,200,0.14)]">
      <div className="flex items-center justify-between border-b border-[#ececec] bg-[#f7f7f7] px-4 py-2.5">
        <div className="flex gap-1">
          {(
            [
              { id: "result" as const, label: "Sample analysis" },
              { id: "connect" as const, label: "Connect MCP" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
                tab === t.id
                  ? "bg-white text-[#0d0d0d] shadow-sm ring-1 ring-[#e3e3e3]"
                  : "text-[#737373] hover:text-[#0d0d0d]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="hidden rounded-full bg-[#eff6ff] px-2.5 py-0.5 font-mono text-[10px] font-medium text-[#006fff] sm:inline">
          analyze_market
        </span>
      </div>

      {tab === "connect" ? (
        <pre className="overflow-x-auto bg-[#0d0d0d] p-6 font-mono text-[13px] leading-relaxed text-[#e2e8f0] md:p-8 md:text-sm">
          <code>{snippet}</code>
        </pre>
      ) : (
        <SampleResult />
      )}
    </div>
  );
}

function SampleResult() {
  return (
    <div className="grid md:grid-cols-2">
      <div className="border-b border-[#ececec] p-6 md:border-b-0 md:border-r md:p-8">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#a3a3a3]">
            Polykit returns
          </p>
          <span className="rounded-full bg-[#f2f2f2] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#8a8a8a]">
            Illustrative example
          </span>
        </div>
        <p className="mt-2 text-[15px] font-semibold leading-snug text-[#0d0d0d]">
          Will the US enter a recession in 2026?
        </p>
        <p className="mt-1 font-mono text-[12px] text-[#737373]">
          polymarket.com/event/us-recession-in-2026
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {[
            { k: "Action", v: "BUY No", accent: "text-[#16a34a]" },
            { k: "Edge", v: "+9.4¢", accent: "text-[#006fff]" },
            { k: "Confidence", v: "72", accent: "text-[#0d0d0d]" },
          ].map((s) => (
            <div
              key={s.k}
              className="rounded-2xl border border-[#ececec] bg-[#f7f7f7] px-3 py-3"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#a3a3a3]">
                {s.k}
              </p>
              <p
                className={`mt-1 font-display text-lg font-semibold tabular-nums md:text-xl ${s.accent}`}
              >
                {s.v}
              </p>
            </div>
          ))}
        </div>

        <ul className="mt-6 space-y-2.5">
          {[
            "GDP tracking +2.1%. No classic pre-recession signal.",
            "Fed has cut twice, loosening conditions into the window.",
            "Similar recession markets historically resolve No ~80%.",
          ].map((r) => (
            <li key={r} className="flex gap-2.5 text-[13px] leading-relaxed text-[#525252]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0080ff]" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Chat mock */}
      <div className="flex min-h-[360px] flex-col bg-[#262624]">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <span className="text-[15px] font-medium text-[#f5f0e8]">Polykit</span>
          <span className="ml-auto text-[11px] text-[#a8a29e]">analyze_market</span>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-6 px-5 pb-2">
          <div className="ml-auto max-w-[88%]">
            <div className="rounded-[18px] bg-[#30302e] px-4 py-3">
              <p className="text-[13px] leading-relaxed text-[#eceae4]">
                Analyze this and tell me if there&apos;s edge:{" "}
                <span className="text-[#c4b5a0]">
                  polymarket.com/event/us-recession-in-2026
                </span>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
              <ClaudeMark size={14} />
            </div>
            <div className="min-w-0 space-y-2.5">
              <p className="text-[11px] text-[#a8a29e]">
                Used <span className="text-[#eceae4]">analyze_market</span>
              </p>
              <p
                className="text-[14px] leading-[1.65] text-[#f5f0e8]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Buying <span className="font-medium">No at 62¢</span>. Fair value looks closer
                to 71¢. Edge is real. Main risk is a sudden credit shock before resolution.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 pt-3">
          <div className="flex items-center gap-2 rounded-[20px] border border-white/[0.08] bg-[#2c2b2a] px-3 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center text-[#78716c]" aria-hidden>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </span>
            <p className="flex-1 text-[13px] text-[#6b6560]">Ask about another market…</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d97757] text-white">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3.5l1.2 5.1 5.1 1.2-5.1 1.2L12 16.1l-1.2-5.1L5.7 9.8l5.1-1.2L12 3.5z" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClaudeMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#d97757" aria-hidden>
      <path d="M12 2.8c.4 0 .62.26.72.78l.92 4.9c.06.3.24.48.54.54l4.9.92c.52.1.78.32.78.72s-.26.62-.78.72l-4.9.92c-.3.06-.48.24-.54.54l-.92 4.9c-.1.52-.32.78-.72.78s-.62-.26-.72-.78l-.92-4.9c-.06-.3-.24-.48-.54-.54l-4.9-.92c-.52-.1-.78-.32-.78-.72s.26-.62.78-.72l4.9-.92c.3-.06.48-.24.54-.54l.92-4.9c.1-.52.32-.78.72-.78z" />
    </svg>
  );
}
