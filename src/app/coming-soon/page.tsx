import type { Metadata } from "next";
import Link from "next/link";
import LaunchWaitlistForm from "@/components/coming-soon/LaunchWaitlistForm";

export const metadata: Metadata = {
  title: "Polykit — Something New Is Coming",
  description:
    "Polykit is evolving. We're rebuilding from the ground up. Drop your email and be first in line when the new product launches.",
  alternates: { canonical: "/" },
};

export default function ComingSoonPage() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-20 text-center text-white"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, #3b6fe6 0%, #1d4ed8 45%, #12329e 100%)",
        }}
      >
        <Aurora />

        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Polykit"
            className="mb-8 h-16 w-16 rounded-2xl shadow-[0_8px_30px_rgba(6,35,84,0.35)] ring-1 ring-white/40"
          />
          <h1 className="mt-8 text-balance font-extrabold leading-[1.02] tracking-tight text-white text-5xl md:text-7xl lg:text-[84px]">
            Polykit is{" "}
            <span className="relative inline-block italic">
              evolving
              <svg
                className="absolute -bottom-2 left-0 w-full"
                height="12"
                viewBox="0 0 120 12"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 8 Q 30 2, 60 6 T 118 5"
                  stroke="white"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            .
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-balance text-base text-white/85 md:text-lg">
            We&apos;re rebuilding Polykit from the ground up into something
            bigger, smarter, and a lot more fun. Drop your email — you&apos;ll be
            first in when it launches.
          </p>

          <div className="mt-10 w-full">
            <LaunchWaitlistForm />
          </div>

          <nav className="mt-10 flex items-center justify-center gap-4 text-sm font-medium text-white/85">
            <Link href="/contact" className="transition hover:text-white">
              Contact
            </Link>
            <span className="opacity-40">|</span>
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <span className="opacity-40">|</span>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </section>
  );
}

function Aurora() {
  // Living aurora: big blurred color blobs that slowly drift and blend over a
  // deep-blue base, plus a masked tech grid for depth.
  const blobs = [
    { className: "-left-24 -top-24 h-[38rem] w-[38rem] bg-cyan-400/40", delay: "0s", duration: "19s" },
    { className: "-right-32 top-[-10%] h-[42rem] w-[42rem] bg-indigo-500/45", delay: "4s", duration: "23s" },
    { className: "left-[10%] bottom-[-20%] h-[40rem] w-[40rem] bg-blue-500/40", delay: "8s", duration: "21s" },
    { className: "right-[6%] bottom-[-10%] h-[30rem] w-[30rem] bg-violet-500/40", delay: "2s", duration: "17s" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {blobs.map((b, i) => (
        <div
          key={i}
          className={`absolute animate-aurora rounded-full blur-[90px] mix-blend-screen ${b.className}`}
          style={{ animationDelay: b.delay, animationDuration: b.duration }}
        />
      ))}
      {/* Tech grid, faded toward the edges */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, black 30%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, black 30%, transparent 78%)",
        }}
      />
      {/* Soft vignette to seat the content */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,transparent_45%,rgba(15,45,150,0.45)_100%)]" />
    </div>
  );
}
