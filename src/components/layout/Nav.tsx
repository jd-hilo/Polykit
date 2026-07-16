"use client";
import { StartCta } from "@/components/auth/StartCta";
import { Logo } from "@/components/layout/Logo";

export function Nav() {
  return (
    <header className="fixed top-0 z-40 w-full px-4 pt-4 md:px-6 md:pt-5">
      <div className="mx-auto flex max-w-5xl justify-center">
        <div className="supaste-nav w-full max-w-3xl justify-between px-3 py-2 sm:px-4">
          <Logo size={28} light className="[&_span]:text-[15px] [&_span]:text-white" />
          <nav className="hidden items-center gap-1 md:flex">
            {[
              ["#features", "Features"],
              ["#setup", "Setup"],
              ["#pricing", "Pricing"],
              ["#faqs", "FAQ"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
          <StartCta location="nav" className="btn-primary btn-primary-sm" onDark />
        </div>
      </div>
    </header>
  );
}
