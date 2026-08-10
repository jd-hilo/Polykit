"use client";
import { useState } from "react";
import { StartCta } from "@/components/auth/StartCta";
import { Check, Copy } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";
const MCP_URL = `${SITE_URL}/api/mcp`;

const STEPS = ["Subscribe", "Add the connector", "Ask for the edge"];

export function HowItWorks() {
  return (
    <section id="setup" className="border-t border-[#e3e3e3] bg-[#f7f7f7] py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6 md:px-10">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#006fff]">Setup</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em] text-[#0d0d0d] md:text-4xl">
            Live in under two minutes
          </h2>
          <p className="mt-3 text-[15px] text-[#737373]">One form inside Claude.</p>
        </div>

        {/* Steps as chips */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className="inline-flex items-center gap-2 rounded-full border border-[#e3e3e3] bg-white px-3.5 py-2 text-[13px] font-medium text-[#525252]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#0080ff] to-[#5f61ed] text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              {s}
            </span>
          ))}
        </div>

        {/* Mock of Claude's actual Add-custom-connector form */}
        <div className="mx-auto mt-8 max-w-xl">
          <ConnectorFormMock />
        </div>

        <div className="mt-8 flex justify-center">
          <StartCta location="setup_cta" label="Connect Polykit" className="btn-primary btn-primary-md" showArrow />
        </div>
      </div>
    </section>
  );
}

/** Faithful mock of Claude's "Add custom connector" dialog, pre-filled. */
function ConnectorFormMock() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#e3e3e3] bg-white shadow-[0_20px_60px_rgba(0,80,200,0.10)]">
      <div className="border-b border-[#ececec] bg-[#fafafa] px-5 py-3.5">
        <p className="text-[14px] font-semibold text-[#0d0d0d]">Add custom connector</p>
        <p className="mt-0.5 text-[12px] text-[#a3a3a3]">Claude → Settings → Connectors</p>
      </div>

      <div className="space-y-4 px-5 py-5">
        <FormField label="Name" value="Polykit" />
        <FormField label="Remote MCP server URL" value={MCP_URL} copyable />

        <div className="rounded-lg border border-dashed border-[#e3e3e3] px-3.5 py-2.5">
          <p className="text-[12px] font-medium text-[#737373]">Advanced settings</p>
          <p className="mt-0.5 text-[12px] text-[#a3a3a3]">Leave empty.</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <span className="rounded-full px-4 py-2 text-[13px] font-medium text-[#737373]">
            Cancel
          </span>
          <span className="rounded-full bg-[#0d0d0d] px-5 py-2 text-[13px] font-semibold text-white">
            Connect
          </span>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-[#525252]">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
        <code className="min-w-0 flex-1 truncate text-[13px] text-[#0d0d0d]">{value}</code>
        {copyable && (
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy ${label}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-[#006fff] transition hover:bg-[#eff6ff]"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
