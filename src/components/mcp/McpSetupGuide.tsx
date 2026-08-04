"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";

type AppId = "chatgpt" | "claude" | "custom";

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-[#006fff] shadow-sm ring-1 ring-[#e3e3e3] transition hover:ring-[#78d2ff]"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : label}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1f1e1d] bg-[#0d0d0d]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
        <span className="text-[11px] text-white/50">{label ?? "config"}</span>
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed text-[#e2e8f0] md:text-[13px]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function McpSetupGuide({ mcpUrl }: { mcpUrl: string }) {
  const [app, setApp] = useState<AppId>("chatgpt");

  const config = `{
  "mcpServers": {
    "polykit": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_CONNECTION_KEY"
      }
    }
  }
}`;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["chatgpt", "ChatGPT"],
            ["claude", "Claude"],
            ["custom", "Custom"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setApp(id)}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              app === id
                ? "bg-gradient-to-r from-[#0080ff] to-[#006fff] text-white shadow-[0_6px_20px_rgba(0,128,255,0.3)]"
                : "border border-[#e3e3e3] bg-white text-[#525252] hover:border-[#78d2ff]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mt-4 rounded-lg bg-[#fffbeb] px-3 py-2 text-[13px] text-[#92400e]">
        Replace <strong>YOUR_CONNECTION_KEY</strong> with a key from your{" "}
        <Link href="/dashboard" className="font-semibold text-[#006fff] underline">
          dashboard
        </Link>
        .
      </p>

      {app === "chatgpt" && (
        <div className="mt-5 space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#525252]">
            <li>
              ChatGPT → <strong>Settings</strong> → <strong>Connectors</strong> →{" "}
              <strong>Add custom connector</strong>.
            </li>
            <li>
              Name it <strong>Polykit</strong>. Paste the MCP URL below.
            </li>
            <li>
              Add header{" "}
              <code className="rounded bg-[#f7f7f7] px-1.5 py-0.5 text-[12px]">
                Authorization: Bearer YOUR_CONNECTION_KEY
              </code>
              .
            </li>
            <li>Save, enable Polykit in chat, then paste a Polymarket link.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e3e3e3] bg-[#f7f7f7] px-3 py-2.5">
            <code className="min-w-0 flex-1 break-all text-[13px] text-[#0d0d0d]">{mcpUrl}</code>
            <CopyButton value={mcpUrl} />
          </div>
        </div>
      )}

      {app === "claude" && (
        <div className="mt-5 space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#525252]">
            <li>
              Claude Desktop: <strong>Settings</strong> → <strong>Developer</strong> →{" "}
              <strong>Edit Config</strong>. Or Claude.ai: <strong>Connectors</strong> →{" "}
              <strong>Add custom connector</strong>.
            </li>
            <li>Paste the config block below (or URL + Bearer header).</li>
            <li>Restart Claude if needed, enable Polykit, then analyze a Polymarket link.</li>
          </ol>
          <CodeBlock code={config} label="Paste into Claude" />
        </div>
      )}

      {app === "custom" && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#525252]">
            Works with Cursor, VS Code, and any MCP client. Paste this into your
            MCP config, then enable Polykit.
          </p>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e3e3e3] bg-[#f7f7f7] px-3 py-2.5">
            <code className="min-w-0 flex-1 break-all text-[13px] text-[#0d0d0d]">{mcpUrl}</code>
            <CopyButton value={mcpUrl} />
          </div>
          <CodeBlock code={config} label="mcp.json" />
        </div>
      )}
    </div>
  );
}
