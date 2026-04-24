"use client";
import { useAuth } from "@/components/auth/AuthProvider";

const FEATURES: [string, string][] = [
  ["Instant Full Access", "to the full Polykit platform"],
  ["AI Market Analyzer", "screenshot any market for instant edge analysis"],
  ["Paper Trading", "simulate trades with a $100,000 virtual balance"],
  ["Wallet Tracker", "follow any Polymarket address and mirror their positions"],
  ["AI Coach", "live-cited strategy advice with specific market picks"],
  ["Trade Strategies", "coming soon — expert strategies you can follow automatically"],
];

export function PricingCard() {
  const { openAuth } = useAuth();
  return (
    <section id="pricing" className="mx-auto max-w-2xl px-4 py-10">
      <div className="space-y-4 rounded-[32px] border-2 border-[#bfdbfe] bg-[#eff6ff] p-3 md:p-4">
        <div className="rounded-[24px] bg-white p-7 md:p-9">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[
                  "/social_proof_candid/01_ferrari_night_lean.jpg",
                  "/social_proof_candid/04_hoodie_sports_car_garage.jpg",
                  "/social_proof_candid/14_private_jet_champagne.jpg",
                  "/social_proof_candid/09_lambo_yellow_london.jpg",
                ].map((src, i, arr) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="h-6 w-6 rounded-full border-2 border-white object-cover" style={{ zIndex: arr.length - i }} />
                ))}
              </div>
              <div className="text-sm text-muted-foreground">Trusted by 21k+ traders</div>
            </div>
            <div className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#166534]">One win pays for your whole month</div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#235ae9] text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" />
              </svg>
            </span>
            <div className="text-3xl font-extrabold tracking-tight">All-Access</div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">You&apos;re getting instant access to the complete Polykit platform.</p>
          <div className="mt-5 flex items-end gap-3">
            <span className="text-4xl font-extrabold">$1</span>
            <span className="text-2xl font-semibold text-muted-foreground">first month</span>
            <span className="mb-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-xs font-semibold text-[#166534]">then $39/mo</span>
          </div>
          <button onClick={openAuth} className="btn-primary btn-primary-md mt-6 w-full">
            Start for $1 <span>→</span>
          </button>
          <div className="mt-5 flex items-center justify-center gap-3 text-xs">
            <TrustpilotStars /> <span className="font-medium">4.9/5</span>
            <span className="text-muted-foreground">|</span>
            <span className="inline-flex items-center gap-1.5 text-[#235ae9]"><Verified /> verified by Proof</span>
          </div>
          <div className="mt-4 flex items-center justify-center gap-5 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Check small /> Instant access</span>
            <span className="inline-flex items-center gap-1"><Check small /> Cancel anytime</span>
            <span className="inline-flex items-center gap-1"><Check small /> Secure checkout</span>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#bfdbfe] bg-white p-7 md:p-9">
          <ul className="space-y-3 text-[15px]">
            {FEATURES.map(([k, v]) => (
              <li key={k} className="flex items-start gap-3">
                <Check />
                <div>
                  <span className="font-semibold text-[#235ae9] underline decoration-[#bfdbfe] decoration-2 underline-offset-4">{k}</span>
                  <span className="text-foreground/80"> {v}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Check({ small }: { small?: boolean } = {}) {
  const s = small ? 12 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#235ae9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function TrustpilotStars() {
  return (
    <div className="flex items-center gap-[2px] rounded bg-[#00b67a] px-1.5 py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z"/></svg>
      ))}
    </div>
  );
}
function Verified() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}
