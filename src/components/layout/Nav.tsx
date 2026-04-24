"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-bold tracking-tight", light ? "text-white" : "text-foreground")}>
      <img src="/logo.png" alt="Polykit" className="h-8 w-8 rounded-lg" />
      <span className="text-lg">Polykit</span>
    </Link>
  );
}

export function Nav({ transparent = false }: { transparent?: boolean }) {
  const { openAuth } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!transparent) return;
    let raf = 0;
    const tick = () => {
      setScrolled(window.scrollY > 40);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [transparent]);
  const onDark = transparent && !scrolled;
  return (
    <header className={cn(
      "sticky top-0 z-40 transition-colors",
      onDark ? "bg-transparent" : "border-b border-border bg-white/95 backdrop-blur"
    )}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className={cn("flex items-center gap-2 font-bold tracking-tight transition-colors", onDark ? "text-white" : "text-foreground")}>
          <img src="/logo.png" alt="Polykit" className="h-8 w-8 rounded-lg" />
          <span className="text-lg">Polykit</span>
        </Link>
        <nav className={cn("hidden items-center gap-10 text-[15px] font-medium md:flex transition-colors", onDark ? "text-white/90" : "text-foreground/80")}>
          <a href="#features" className="hover:opacity-80 transition">Features</a>
          <a href="#faqs" className="hover:opacity-80 transition">FAQs</a>
          <a href="#pricing" className="hover:opacity-80 transition">Pricing</a>
        </nav>
        {onDark ? (
          <button onClick={openAuth} className="inline-flex items-center rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/20">
            Try Polykit for $39
          </button>
        ) : (
          <button onClick={openAuth} className="btn-primary btn-primary-sm">
            Try Polykit for $39
          </button>
        )}
      </div>
    </header>
  );
}
