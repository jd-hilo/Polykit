"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Key,
  Plug,
  Terminal,
  AlertCircle,
} from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";
const MCP_URL = `${SITE_URL}/api/mcp`;

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="overflow-hidden rounded-xl border border-[#1f1e1d] bg-[#0d0d0d]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
        <span className="font-mono text-[11px] text-white/50">{label ?? "config"}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-white/55 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-[#e2e8f0] md:text-[13px]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

type ConnectorId = "claude" | "chatgpt" | "custom" | "openclaw";

const CONNECTORS: { id: ConnectorId; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "custom", label: "Custom" },
  { id: "openclaw", label: "OpenClaw" },
];

const remoteJson = `{
  "mcpServers": {
    "polykit": {
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`;

const mcpRemoteJson = `{
  "mcpServers": {
    "polykit": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "${MCP_URL}",
        "--header", "Authorization: Bearer YOUR_API_KEY"
      ]
    }
  }
}`;

const cliCommand = `claude mcp add --transport http polykit ${MCP_URL} \\
  --header "Authorization: Bearer YOUR_API_KEY"`;

const curlTest = `curl -sN ${MCP_URL} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{
    "jsonrpc":"2.0","id":1,"method":"tools/call",
    "params":{
      "name":"analyze_market",
      "arguments":{"url":"https://polymarket.com/event/us-recession-in-2026"}
    }
  }'`;

function ClaudeGuide() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-[15px] font-semibold text-[#0d0d0d]">Claude Desktop</h4>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-[#525252]">
          <li>
            Settings → <strong>Developer</strong> → <strong>Edit Config</strong>.
          </li>
          <li>
            macOS:{" "}
            <code className="font-mono text-[12px]">
              ~/Library/Application Support/Claude/claude_desktop_config.json
            </code>
            <br />
            Windows:{" "}
            <code className="font-mono text-[12px]">
              %APPDATA%\Claude\claude_desktop_config.json
            </code>
          </li>
          <li>Merge the block below, then fully quit and reopen Claude.</li>
        </ol>
        <div className="mt-3">
          <CodeBlock code={remoteJson} label="claude_desktop_config.json" />
        </div>
        <p className="mt-3 text-[13px] text-[#737373]">
          If your build doesn&apos;t accept a remote{" "}
          <code className="font-mono text-[12px]">url</code> yet, use the{" "}
          <code className="font-mono text-[12px]">mcp-remote</code> bridge:
        </p>
        <div className="mt-2">
          <CodeBlock code={mcpRemoteJson} label="mcp-remote fallback" />
        </div>
      </div>

      <div>
        <h4 className="text-[15px] font-semibold text-[#0d0d0d]">Claude.ai (web)</h4>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-[#525252]">
          <li>
            Settings → <strong>Connectors</strong> → <strong>Add custom connector</strong>.
          </li>
          <li>
            Name <strong>Polykit</strong>, URL{" "}
            <code className="font-mono text-[12px]">{MCP_URL}</code>.
          </li>
          <li>
            Add header{" "}
            <code className="font-mono text-[12px]">
              Authorization: Bearer YOUR_API_KEY
            </code>
            .
          </li>
          <li>Save, then enable the connector in your chat.</li>
        </ol>
      </div>

      <div>
        <h4 className="text-[15px] font-semibold text-[#0d0d0d]">Claude Code (CLI)</h4>
        <div className="mt-3">
          <CodeBlock code={cliCommand} label="terminal" />
        </div>
      </div>
    </div>
  );
}

function ChatgptGuide() {
  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-[#525252]">
        <li>
          ChatGPT → <strong>Settings</strong> → <strong>Connectors</strong> →{" "}
          <strong>Advanced</strong> → <strong>Add custom connector</strong> (requires a plan
          with connector access).
        </li>
        <li>
          MCP Server URL: <code className="font-mono text-[12px]">{MCP_URL}</code>
        </li>
        <li>
          Add header{" "}
          <code className="font-mono text-[12px]">
            Authorization: Bearer YOUR_API_KEY
          </code>
          .
        </li>
        <li>
          In the composer, open <strong>Connectors</strong> and enable Polykit so the model
          can call <code className="font-mono text-[12px]">analyze_market</code>.
        </li>
      </ol>
      <p className="text-[13px] text-[#737373]">
        Connector availability varies by plan and region. If yours only supports OAuth, use
        Claude, Cursor, or a custom client. All accept Bearer headers.
      </p>
    </div>
  );
}

function CustomGuide() {
  return (
    <div className="space-y-4">
      <p className="text-[14px] leading-relaxed text-[#525252]">
        Any MCP-compatible client (Cursor, VS Code, Cline, Continue, your own code) connects
        with the same remote URL and Bearer header. Drop this into the client&apos;s MCP
        config:
      </p>
      <CodeBlock code={remoteJson} label="mcp.json" />
      <p className="text-[14px] leading-relaxed text-[#525252]">
        Or hit the endpoint directly over JSON-RPC. Streamable HTTP requires{" "}
        <code className="font-mono text-[12px]">text/event-stream</code> in{" "}
        <code className="font-mono text-[12px]">Accept</code>:
      </p>
      <CodeBlock code={curlTest} label="curl" />
    </div>
  );
}

function OpenClawGuide() {
  return (
    <div className="space-y-4">
      <p className="text-[14px] leading-relaxed text-[#525252]">
        OpenClaw reads standard remote-MCP config. Add Polykit as a server with the URL and
        Bearer header below, then reload OpenClaw and enable the connector.
      </p>
      <CodeBlock code={remoteJson} label="openclaw mcp config" />
      <p className="text-[13px] text-[#737373]">
        If OpenClaw only supports stdio servers, use the{" "}
        <code className="font-mono text-[12px]">mcp-remote</code> bridge instead:
      </p>
      <CodeBlock code={mcpRemoteJson} label="mcp-remote fallback" />
    </div>
  );
}

export default function SetupPage() {
  const [active, setActive] = useState<ConnectorId>("claude");

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <p className="max-w-2xl text-sm text-[#525252]">
        Connect Polykit to any MCP client, then call{" "}
        <code className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[13px] ring-1 ring-[#e3e3e3]">
          analyze_market
        </code>{" "}
        on any Polymarket market.
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Plug, k: "Endpoint", v: MCP_URL.replace("https://", "") },
          { icon: Terminal, k: "Transport", v: "Streamable HTTP + SSE" },
          { icon: Key, k: "Auth", v: "Bearer pk_live_…" },
        ].map(({ icon: Icon, k, v }) => (
          <div
            key={k}
            className="rounded-2xl border border-[#e3e3e3] bg-white px-4 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0080ff] to-[#5f61ed] text-white">
              <Icon size={15} />
            </span>
            <dt className="mt-3 text-[11px] font-medium uppercase tracking-wide text-[#a3a3a3]">
              {k}
            </dt>
            <dd className="truncate font-mono text-[12px] font-semibold text-[#0d0d0d]">
              {v}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#ffe9b3] bg-[#fffbeb] px-4 py-3 text-[14px] text-[#92400e]">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <span>
          Replace <code className="font-mono">YOUR_API_KEY</code> with a key from{" "}
          <Link href="/dashboard/keys" className="font-semibold text-[#006fff] underline">
            API Keys
          </Link>
          . An active subscription is required to mint one.
        </span>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {CONNECTORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              active === c.id
                ? "bg-gradient-to-r from-[#0080ff] to-[#006fff] text-white shadow-[0_6px_20px_rgba(0,128,255,0.3)]"
                : "border border-[#e3e3e3] bg-white text-[#525252] hover:border-[#78d2ff] hover:text-[#0d0d0d]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-[#e3e3e3] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:p-8">
        {active === "claude" && <ClaudeGuide />}
        {active === "chatgpt" && <ChatgptGuide />}
        {active === "custom" && <CustomGuide />}
        {active === "openclaw" && <OpenClawGuide />}
      </div>
    </div>
  );
}
