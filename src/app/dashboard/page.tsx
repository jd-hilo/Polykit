"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import { Key, Activity, Plug, Check } from "lucide-react";

const MCP_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/mcp`
  : "https://polykit.co/api/mcp";

export default function DashboardHome() {
  const { hasAccess, openAuth } = useAuth();

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#0d0d0d]">
          Overview
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Billing, keys, and your MCP connection in one place.
        </p>
      </div>

      {/* Subscription card */}
      <div className="relative mb-6 overflow-hidden rounded-2xl">
        <div aria-hidden className="supaste-banner absolute inset-0" />
        <div className="relative flex flex-wrap items-center justify-between gap-4 p-6 md:p-7">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-white/70">
              Subscription
            </p>
            <p className="mt-1 text-xl font-semibold text-white">
              {hasAccess ? "Active" : "Not subscribed"}
            </p>
            {!hasAccess && (
              <p className="mt-1 text-sm text-white/75">$1 first month, then $39/mo</p>
            )}
            {hasAccess && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/80">
                <Check size={14} className="text-[#78d2ff]" />
                Full MCP access
              </p>
            )}
          </div>
          {!hasAccess ? (
            <button onClick={() => openAuth("dashboard")} className="btn-hero">
              Start for $1 →
            </button>
          ) : (
            <Link
              href="/dashboard/settings"
              className="rounded-full border border-white/30 bg-white/15 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              Manage billing
            </Link>
          )}
        </div>
      </div>

      {/* Connect card */}
      <div className="rounded-2xl border border-[#e3e3e3] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0080ff] to-[#5f61ed] text-white shadow-md shadow-[#0080ff]/25">
            <Plug size={18} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#0d0d0d]">Connect your AI</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#525252]">
              Add Polykit as a custom MCP in Claude or ChatGPT. Use your API key as a Bearer
              token.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e3e3e3] bg-[#f7f7f7] px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-wide text-[#a3a3a3]">
              MCP URL
            </p>
            <code className="mt-1 block break-all font-mono text-[13px] font-medium text-[#0d0d0d]">
              {MCP_URL}
            </code>
          </div>
          <div className="rounded-xl border border-[#e3e3e3] bg-[#f7f7f7] px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-wide text-[#a3a3a3]">
              Authorization
            </p>
            <code className="mt-1 block font-mono text-[13px] font-medium text-[#0d0d0d]">
              Bearer pk_live_…
            </code>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/keys" className="btn-primary btn-primary-md">
            <Key size={15} />
            {hasAccess ? "Create API key" : "Subscribe to get keys"}
          </Link>
          <Link
            href="/dashboard/setup"
            className="inline-flex items-center gap-2 rounded-full border border-[#e3e3e3] bg-white px-5 py-2.5 text-sm font-medium text-[#525252] transition hover:border-[#78d2ff] hover:text-[#0d0d0d]"
          >
            Setup guides
          </Link>
          <Link
            href="/dashboard/usage"
            className="inline-flex items-center gap-2 rounded-full border border-[#e3e3e3] bg-white px-5 py-2.5 text-sm font-medium text-[#525252] transition hover:border-[#78d2ff] hover:text-[#0d0d0d]"
          >
            <Activity size={15} />
            View usage
          </Link>
        </div>
      </div>

      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          "Subscribe and create an API key",
          "Add the MCP connector with URL + Bearer token",
          "Ask Claude to analyze any Polymarket link",
        ].map((step, i) => (
          <li
            key={step}
            className="rounded-xl border border-[#e3e3e3] bg-white px-4 py-3 text-sm text-[#525252]"
          >
            <span className="mb-1 block font-mono text-[11px] font-semibold text-[#006fff]">
              0{i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
