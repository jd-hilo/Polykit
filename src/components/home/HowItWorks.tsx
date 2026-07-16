"use client";
import { StartCta } from "@/components/auth/StartCta";
import { Key, Plug, Sparkles } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";
const MCP_URL = `${SITE_URL}/api/mcp`;

const STEPS = [
  {
    icon: Key,
    title: "Get access",
    body: "Subscribe for $1 and create your API key in the dashboard.",
  },
  {
    icon: Plug,
    title: "Connect once",
    body: "Add Polykit to Claude, ChatGPT, or any MCP client. Takes about two minutes.",
  },
  {
    icon: Sparkles,
    title: "Ask for the edge",
    body: "Drop any Polymarket link into chat and get a verdict you can act on.",
  },
];

export function HowItWorks() {
  return (
    <section id="setup" className="border-t border-[#e3e3e3] bg-[#f7f7f7] py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6 md:px-10">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#006fff]">Setup</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em] text-[#0d0d0d] md:text-4xl">
            Live in under two minutes
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[#525252]">
            Subscribe, grab a key, paste one config block. Full connector guides are in your
            dashboard after signup.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div
              key={title}
              className="rounded-2xl border border-[#e3e3e3] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#0080ff] to-[#5f61ed] text-white">
                  <Icon size={16} />
                </span>
                <span className="font-mono text-xs text-[#a3a3a3]">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-[#0d0d0d]">
                {title}
              </h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#525252]">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-[#e3e3e3] bg-white px-6 py-5 shadow-sm sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-[#0d0d0d]">Endpoint</p>
            <code className="font-mono text-[13px] text-[#525252]">
              {MCP_URL.replace("https://", "")}
            </code>
          </div>
          <StartCta location="setup_cta" className="btn-primary btn-primary-md" showArrow />
        </div>
      </div>
    </section>
  );
}
