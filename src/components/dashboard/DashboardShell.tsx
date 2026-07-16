"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Key,
  Activity,
  Settings,
  Plug,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";

const NAV = [
  { href: "/dashboard", icon: Home, label: "Overview" },
  { href: "/dashboard/setup", icon: Plug, label: "Setup" },
  { href: "/dashboard/keys", icon: Key, label: "API Keys" },
  { href: "/dashboard/usage", icon: Activity, label: "Usage" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

const PAGE_HEADERS: Record<string, { title: string; icon: LucideIcon }> = {
  "/dashboard/setup": { title: "Setup", icon: Plug },
  "/dashboard/keys": { title: "API Keys", icon: Key },
  "/dashboard/usage": { title: "Usage", icon: Activity },
  "/dashboard/settings": { title: "Settings", icon: Settings },
};

function getPageHeader(pathname: string) {
  if (pathname === "/dashboard") return null;
  const keys = Object.keys(PAGE_HEADERS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (pathname === k || pathname.startsWith(k + "/")) return PAGE_HEADERS[k];
  }
  return null;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  const header = getPageHeader(pathname);
  const HeaderIcon = header?.icon;

  return (
    <div className="flex min-h-screen bg-[#f7f7f7] font-sans text-[#0d0d0d]">
      <aside className="sticky top-0 flex h-screen w-[72px] flex-col border-r border-white/10 bg-[#0d0d0d] py-5 md:w-56 md:px-3">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2.5 px-2 md:justify-start md:px-3"
          aria-label="Polykit home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={30} height={30} className="rounded-lg" />
          <span className="hidden font-display text-[15px] font-semibold text-white md:inline">
            Polykit
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-1.5 md:px-0">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active =
              pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-center gap-3 rounded-full px-3 py-2.5 text-[13px] font-medium transition md:justify-start ${
                  active
                    ? "bg-gradient-to-r from-[#0080ff] to-[#006fff] text-white shadow-[0_6px_20px_rgba(0,128,255,0.35)]"
                    : "text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={17} className="shrink-0" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex justify-center px-2 md:justify-start md:px-3">
          <UserButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {header && (
          <header className="flex h-14 items-center gap-2.5 border-b border-[#e3e3e3] bg-white/80 px-6 backdrop-blur-md md:px-8">
            {HeaderIcon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0080ff] to-[#5f61ed] text-white">
                <HeaderIcon size={15} />
              </span>
            )}
            <h1 className="text-[15px] font-semibold tracking-[-0.01em]">{header.title}</h1>
          </header>
        )}
        <main className="relative flex-1 overflow-auto">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-40"
            style={{
              background:
                "linear-gradient(#19009600 0%, #0080ff12 0%, #78d2ff18 40%, transparent 100%)",
            }}
          />
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  );
}
