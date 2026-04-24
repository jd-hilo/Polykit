"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { LiveWinPopup } from "./LiveWinPopup";

export function Hero() {
  const { openAuth } = useAuth();
  return (
    <section className="relative overflow-hidden">
      <div
        className="relative pt-20 pb-40 text-white md:pt-28 md:pb-56"
        style={{
          background:
            "linear-gradient(180deg, #1d4ed8 0%, #1e4fd6 35%, #3b74ef 70%, #93b6ff 90%, #ffffff 100%)",
        }}
      >
        <Stars />
        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <SocialProofPill />
          <h1 className="mt-8 text-balance font-extrabold leading-[1.02] tracking-tight text-white text-5xl md:text-7xl lg:text-[84px]">
            The #1 AI Tool To{" "}
            <span className="relative inline-block italic">
              Beat
              <svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 120 12" preserveAspectRatio="none">
                <path d="M2 8 Q 30 2, 60 6 T 118 5" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            </span>
            <br />
            Prediction Markets
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-balance text-base text-white/85 md:text-lg">
            Your all in one tool for making money on Polymarket, Kalshi &amp; other prediction markets with the power of AI
          </p>
          <div className="mt-10 flex justify-center">
            <button onClick={openAuth} className="btn-hero group">
              Get My Winning Edge
              <span className="transition group-hover:translate-x-1">→</span>
            </button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-white/90">
            <TrustpilotStars /> 4.9/5
            <span className="opacity-40">|</span>
            <span className="inline-flex items-center gap-1.5"><VerifiedDot /> verified by Proof</span>
          </div>
          <p className="mt-5 text-[12px] italic text-white/70">
            *Works with Polymarket, Kalshi &amp; more. Polykit never touches your money or wallet.
          </p>
        </div>
      </div>
      <LiveWinPopup />
    </section>
  );
}

function SocialProofPill() {
  return (
    <div className="mx-auto inline-flex items-center gap-3 text-sm text-white/90">
      <AvatarStack />
      <span><span className="font-bold text-white">$3,453,287+</span> won by people like you</span>
      <VerifiedDot />
    </div>
  );
}

function AvatarStack() {
  const imgs = [
    "/social_proof_candid/01_ferrari_night_lean.jpg",
    "/social_proof_candid/04_hoodie_sports_car_garage.jpg",
    "/social_proof_candid/14_private_jet_champagne.jpg",
  ];
  return (
    <div className="flex -space-x-2">
      {imgs.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt=""
          className="h-7 w-7 rounded-full border-2 border-white/40 object-cover"
          style={{ zIndex: imgs.length - i }}
        />
      ))}
    </div>
  );
}

function TrustpilotStars() {
  return (
    <div className="flex items-center gap-[2px] rounded bg-[#00b67a] px-1.5 py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z"/></svg>
      ))}
    </div>
  );
}

function VerifiedDot() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stars() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => {
        const size = 1 + (i % 4);
        return (
          <span
            key={i}
            className="absolute rounded-full bg-white animate-star-float"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${(i * 37) % 85}%`,
              width: `${size}px`,
              height: `${size}px`,
              opacity: 0.2 + (i % 5) * 0.15,
              animationDelay: `${(i % 8) * 0.35}s`,
            }}
          />
        );
      })}
    </div>
  );
}
