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

  const claudeCodeCmd = `claude mcp add --transport http polykit ${mcpUrl} \\
  --header "Authorization: Bearer YOUR_CONNECTION_KEY"`;

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
        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#006fff] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                Easiest
              </span>
              <p className="text-[14px] font-semibold text-[#0d0d0d]">
                Claude.ai (web &amp; mobile)
              </p>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[#1e40af]">
              No connection key needed — you sign in to Polykit instead.
            </p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[#525252]">
              <li>
                <strong>Settings</strong> → <strong>Connectors</strong> →{" "}
                <strong>Add custom connector</strong>.
              </li>
              <li>
                Name it <strong>Polykit</strong> and paste the URL below.
              </li>
              <li>
                Leave <strong>OAuth Client ID</strong> and <strong>Client Secret</strong> empty.
              </li>
              <li>
                Click <strong>Connect</strong>, sign in, and approve access.
              </li>
            </ol>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#bfdbfe] bg-white px-3 py-2.5">
              <code className="min-w-0 flex-1 break-all text-[13px] text-[#0d0d0d]">{mcpUrl}</code>
              <CopyButton value={mcpUrl} />
            </div>
          </div>

          <div>
            <p className="text-[14px] font-semibold text-[#0d0d0d]">Claude Desktop</p>
            <p className="mt-2 text-sm leading-relaxed text-[#525252]">
              <strong>Settings</strong> → <strong>Developer</strong> →{" "}
              <strong>Edit Config</strong>, paste the block below, then quit and reopen Claude.
            </p>
            <div className="mt-3">
              <CodeBlock code={config} label="claude_desktop_config.json" />
            </div>
          </div>

          <div>
            <p className="text-[14px] font-semibold text-[#0d0d0d]">Claude Code</p>
            <p className="mt-2 text-sm leading-relaxed text-[#525252]">
              One command in your terminal:
            </p>
            <div className="mt-3">
              <CodeBlock code={claudeCodeCmd} label="Terminal" />
            </div>
          </div>
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
