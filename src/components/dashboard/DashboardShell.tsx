"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ScanSearch,
  FlaskConical,
  Wallet,
  MessageCircle,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";

const NAV = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/dashboard/ai-analyzer", icon: ScanSearch, label: "AI Analyzer" },
  { href: "/dashboard/positions", icon: FlaskConical, label: "Paper Trading" },
  { href: "/dashboard/wallet-tracker", icon: Wallet, label: "Wallet Tracker" },
  { href: "/dashboard/ai-coach", icon: MessageCircle, label: "AI Coach" },
];

// Page header shown in the topbar for every dashboard sub-route.
// The /dashboard home gets no header (returns null).
const PAGE_HEADERS: Record<string, { title: string; icon: LucideIcon }> = {
  "/dashboard/ai-analyzer":    { title: "AI Analyzer",    icon: ScanSearch },
  "/dashboard/positions":      { title: "Paper Trading",  icon: FlaskConical },
  "/dashboard/wallet-tracker": { title: "Wallet Tracker", icon: Wallet },
  "/dashboard/ai-coach":       { title: "AI Coach",       icon: MessageCircle },
};

function getPageHeader(pathname: string) {
  if (pathname === "/dashboard") return null;
  // Match longest prefix so nested routes inherit the parent header.
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
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: "rgb(255,255,255)", fontFamily: "OpenSauceOne, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* ── Sidebar ── 80px wide, icon-only, white bg, right border */}
      <aside
        className="sticky top-0 flex h-screen flex-col items-center py-6"
        style={{
          width: 80,
          backgroundColor: "rgb(255,255,255)",
          borderRight: "1px solid rgb(229,231,235)",
          flexShrink: 0,
        }}
      >
        {/* Logo button — 48×48, mb-4 */}
        <Link
          href="/"
          className="mb-4 flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ width: 48, height: 48 }}
          aria-label="Polykit home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Polykit logo"
            width={48}
            height={48}
            className="rounded-lg"
            style={{ width: 48, height: 48 }}
          />
        </Link>

        {/* Nav items — 64×64 buttons with 12px radius */}
        <nav className="flex flex-1 flex-col items-center gap-4">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                className="flex items-center justify-center transition-colors duration-200"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  color: active ? "rgb(36,99,235)" : "rgb(107,114,128)",
                  backgroundColor: active ? "rgba(36,99,235,0.06)" : "transparent",
                }}
              >
                <Icon size={24} />
              </Link>
            );
          })}
        </nav>

        {/* Settings icon — pinned to bottom */}
        <Link
          href="/dashboard/settings"
          title="Settings"
          aria-label="Settings"
          className="flex items-center justify-center transition-colors duration-200 mb-2"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            color: pathname.startsWith("/dashboard/settings") ? "rgb(36,99,235)" : "rgb(156,163,175)",
            backgroundColor: pathname.startsWith("/dashboard/settings") ? "rgba(36,99,235,0.06)" : "transparent",
          }}
        >
          <Settings size={18} />
        </Link>
      </aside>

      {/* ── Main column (topbar + content) ── */}
      <div className="flex min-w-0 flex-1 flex-col" style={{ color: "rgb(20,24,31)" }}>
        {/* Topbar — 52px tall, white, no bottom border per spec */}
        <header
          className="sticky top-0 z-20 flex w-full items-center justify-between bg-white"
          style={{
            height: 52,
            padding: "12px 32px 0px",
          }}
        >
          {/* Left: icon + page title (hidden on /dashboard home) */}
          {header && HeaderIcon ? (
            <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
              <div
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: "rgba(36,99,235,0.08)",
                  flexShrink: 0,
                }}
              >
                <HeaderIcon size={16} style={{ color: "rgb(36,99,235)" }} />
              </div>
              <h1
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: "rgb(20,24,31)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {header.title}
              </h1>
            </div>
          ) : (
            <div />
          )}


          {/* Right: Clerk UserButton — 40px rounded */}
          <div
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserButton
              appearance={{
                elements: {
                  avatarBox: { width: 40, height: 40, borderRadius: 9999 },
                  userButtonAvatarBox: { width: 40, height: 40, borderRadius: 9999 },
                },
              }}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto" style={{ backgroundColor: "rgb(255,255,255)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
