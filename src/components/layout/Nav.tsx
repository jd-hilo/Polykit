"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StartCta } from "@/components/auth/StartCta";
import { Logo } from "@/components/layout/Logo";

export function Nav() {
  const pathname = usePathname();
  const onHome = pathname === "/";

  const links = [
    [onHome ? "#features" : "/#features", "Features"],
    ["/mcp", "MCP setup"],
    [onHome ? "#pricing" : "/pricing", "Pricing"],
    [onHome ? "#faqs" : "/#faqs", "FAQ"],
  ] as const;

  return (
    <header className="fixed top-0 z-40 w-full px-4 pt-4 md:px-6 md:pt-5">
      <div className="mx-auto flex max-w-5xl justify-center">
        <div className="supaste-nav w-full max-w-3xl justify-between px-3 py-2 sm:px-4">
          <Logo size={28} light className="[&_span]:text-[15px] [&_span]:text-white" />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map(([href, label]) => (
              <Link
                key={label}
                href={href}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>
          <StartCta location="nav" className="btn-primary btn-primary-sm" onDark />
        </div>
      </div>
    </header>
  );
}
