"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, ChevronDown, Trash2 } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";
const MCP_URL = `${SITE_URL}/api/mcp`;
const SAMPLE_PROMPT =
  "Analyze this Polymarket market and tell me if there's edge: https://polymarket.com/event/us-recession-in-2026";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

type AppId = "claude" | "chatgpt" | "custom";

function StepBadge({
  n,
  done,
}: {
  n: number;
  done?: boolean;
}) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
        done
          ? "bg-[#16a34a] text-white"
          : "bg-gradient-to-br from-[#0080ff] to-[#5f61ed] text-white"
      }`}
    >
      {done ? <Check size={15} strokeWidth={2.5} /> : n}
    </span>
  );
}

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

/** One row of a connector form: the field's exact label, and what to paste in it. */
function ConnectorField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#bfdbfe] bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#737373]">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all text-[13px] text-[#0d0d0d]">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
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

export default function DashboardHome() {
  const { hasAccess, openAuth } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [app, setApp] = useState<AppId>("claude");
  const [showManage, setShowManage] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/keys");
      const text = await res.text();
      const data = text
        ? (JSON.parse(text) as { keys?: ApiKeyRow[]; error?: string })
        : {};
      if (res.ok) setKeys(data.keys ?? []);
      else setError(data.error ?? "Failed to load keys");
    } catch {
      setError("Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createKey() {
    if (!hasAccess) {
      openAuth("dashboard");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", { method: "POST" });
      const text = await res.text();
      const data = text
        ? (JSON.parse(text) as { key?: string; error?: string })
        : {};
      if (!res.ok) {
        setError(data.error ?? "Failed to create key");
        return;
      }
      setFreshKey(data.key ?? null);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Delete this key? Anything using it will stop working.")) return;
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    if (freshKey) setFreshKey(null);
    await load();
  }

  const keyForConfig = freshKey ?? "YOUR_CONNECTION_KEY";
  const hasKey = keys.length > 0 || Boolean(freshKey);
  const step1Done = hasAccess;
  const step2Done = hasKey;

  const claudeConfig = useMemo(
    () => `{
  "mcpServers": {
    "polykit": {
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer ${keyForConfig}"
      }
    }
  }
}`,
    [keyForConfig],
  );

  const claudeCodeCmd = useMemo(
    () =>
      `claude mcp add --transport http polykit ${MCP_URL} \\\n  --header "Authorization: Bearer ${keyForConfig}"`,
    [keyForConfig],
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:px-10 md:py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#0d0d0d]">
          Get connected
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Four steps. About two minutes. Then ask your AI about any Polymarket link.
        </p>
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <ol className="space-y-4">
        {/* Step 1 */}
        <li className="rounded-2xl border border-[#e3e3e3] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:p-6">
          <div className="flex gap-3">
            <StepBadge n={1} done={step1Done} />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-[#0d0d0d]">
                {step1Done ? "You're unlocked" : "Unlock Polykit"}
              </h2>
              <p className="mt-1 text-sm text-[#525252]">
                {step1Done
                  ? "Your subscription is active. You can create a connection key."
                  : "$14/mo, cancel anytime. Your first month is $1."}
              </p>
              {!step1Done && (
                <button
                  type="button"
                  onClick={() => openAuth("dashboard")}
                  className="btn-primary btn-primary-md mt-4"
                >
                  Unlock Polykit →
                </button>
              )}
              {step1Done && (
                <Link
                  href="/dashboard/settings"
                  className="mt-3 inline-block text-[13px] font-medium text-[#006fff] hover:underline"
                >
                  Manage billing
                </Link>
              )}
            </div>
          </div>
        </li>

        {/* Step 2 */}
        <li className="rounded-2xl border border-[#e3e3e3] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:p-6">
          <div className="flex gap-3">
            <StepBadge n={2} done={step2Done} />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-[#0d0d0d]">
                Get your connection key
              </h2>
              <p className="mt-1 text-sm text-[#525252]">
                This is like a password for your AI. We only show the full key once — copy it.
              </p>

              {freshKey ? (
                <div className="relative mt-4 overflow-hidden rounded-xl">
                  <div aria-hidden className="supaste-banner absolute inset-0" />
                  <div className="relative p-4">
                    <p className="text-[13px] font-semibold text-white">
                      Copy this now — you won&apos;t see it again
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <code className="min-w-0 flex-1 break-all rounded-lg border border-white/25 bg-white/15 px-3 py-2.5 text-[13px] text-white">
                        {freshKey}
                      </code>
                      <CopyButton value={freshKey} />
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={createKey}
                  disabled={creating || loading}
                  className="btn-primary btn-primary-md mt-4 disabled:opacity-60"
                >
                  {!hasAccess
                    ? "Unlock first"
                    : creating
                      ? "Creating…"
                      : hasKey
                        ? "Create another key"
                        : "Create key"}
                </button>
              )}

              {!freshKey && hasKey && !loading && (
                <p className="mt-3 text-[13px] text-[#737373]">
                  You already have {keys.length} key{keys.length === 1 ? "" : "s"}. Create a
                  new one if you lost the old password, or open Manage keys below.
                </p>
              )}
            </div>
          </div>
        </li>

        {/* Step 3 */}
        <li className="rounded-2xl border border-[#e3e3e3] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:p-6">
          <div className="flex gap-3">
            <StepBadge n={3} />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-[#0d0d0d]">
                Plug it into your AI
              </h2>
              <p className="mt-1 text-sm text-[#525252]">
                Pick the app you use. Claude.ai signs you in directly; every other client
                uses your connection key.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    ["claude", "Claude"],
                    ["chatgpt", "ChatGPT"],
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

              {!freshKey && hasKey && app !== "claude" && (
                <p className="mt-3 rounded-lg bg-[#fffbeb] px-3 py-2 text-[13px] text-[#92400e]">
                  Replace <strong>YOUR_CONNECTION_KEY</strong> with the key you copied when you
                  created it. Or create a new key above so we fill it in for you.
                </p>
              )}
              {!freshKey && hasKey && app === "claude" && (
                <p className="mt-3 rounded-lg bg-[#fffbeb] px-3 py-2 text-[13px] text-[#92400e]">
                  Connecting from claude.ai? Ignore the key entirely. For Desktop and Code,
                  replace <strong>YOUR_CONNECTION_KEY</strong> with the key you copied, or
                  create a new one above.
                </p>
              )}

              {app === "claude" && (
                <div className="mt-4 space-y-5">
                  {/* claude.ai signs you in with OAuth, so it needs no key at all. The
                      field names below mirror Claude's form exactly. */}
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
                      No connection key needed — you&apos;ll sign in to Polykit instead.
                    </p>

                    <p className="mt-3.5 text-[13px] font-medium text-[#0d0d0d]">
                      1. Go to Settings → Connectors → Add custom connector
                    </p>

                    <p className="mt-3.5 text-[13px] font-medium text-[#0d0d0d]">
                      2. Fill in the two fields:
                    </p>
                    <div className="mt-2 space-y-2">
                      <ConnectorField label="Name" value="Polykit" />
                      <ConnectorField label="Remote MCP server URL" value={MCP_URL} />
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-[#525252]">
                      Leave everything under <strong>Advanced settings</strong> blank — the
                      OAuth Client ID and Secret are not needed.
                    </p>

                    <p className="mt-3.5 text-[13px] font-medium text-[#0d0d0d]">
                      3. Click <span className="font-semibold">Connect</span>
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#525252]">
                      Sign in to Polykit, press <strong>Approve and connect</strong>, and
                      you&apos;re done. Then turn Polykit on in a chat.
                    </p>
                  </div>

                  {/* Desktop and Code read a config file, so they use the key. */}
                  <div>
                    <p className="text-[14px] font-semibold text-[#0d0d0d]">Claude Desktop</p>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[#525252]">
                      <li>
                        <strong>Settings</strong> → <strong>Developer</strong> →{" "}
                        <strong>Edit Config</strong>.
                      </li>
                      <li>Paste the block below, keeping any servers already listed.</li>
                      <li>Quit and reopen Claude, then turn Polykit on in the chat.</li>
                    </ol>
                    <div className="mt-3">
                      <CodeBlock code={claudeConfig} label="claude_desktop_config.json" />
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

              {app === "chatgpt" && (
                <div className="mt-4 space-y-4">
                  <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#525252]">
                    <li>
                      ChatGPT → <strong>Settings</strong> → <strong>Connectors</strong> →{" "}
                      <strong>Add custom connector</strong>.
                    </li>
                    <li>
                      Name it <strong>Polykit</strong>. Paste the URL below.
                    </li>
                    <li>
                      Add a header:{" "}
                      <code className="rounded bg-[#f7f7f7] px-1.5 py-0.5 text-[12px]">
                        Authorization
                      </code>{" "}
                      ={" "}
                      <code className="rounded bg-[#f7f7f7] px-1.5 py-0.5 text-[12px]">
                        Bearer {freshKey ?? "YOUR_CONNECTION_KEY"}
                      </code>
                    </li>
                    <li>Save, then enable Polykit in your chat.</li>
                  </ol>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e3e3e3] bg-[#f7f7f7] px-3 py-2.5">
                    <code className="min-w-0 flex-1 break-all text-[13px] text-[#0d0d0d]">
                      {MCP_URL}
                    </code>
                    <CopyButton value={MCP_URL} />
                  </div>
                  {freshKey && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e3e3e3] bg-[#f7f7f7] px-3 py-2.5">
                      <code className="min-w-0 flex-1 break-all text-[12px] text-[#0d0d0d]">
                        Bearer {freshKey}
                      </code>
                      <CopyButton value={`Bearer ${freshKey}`} label="Copy header" />
                    </div>
                  )}
                </div>
              )}

              {app === "custom" && (
                <div className="mt-4 space-y-4">
                  <p className="text-sm leading-relaxed text-[#525252]">
                    Works with Cursor, VS Code, Cline, or any MCP client. Paste this
                    into your client&apos;s MCP config, then turn Polykit on.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e3e3e3] bg-[#f7f7f7] px-3 py-2.5">
                    <code className="min-w-0 flex-1 break-all text-[13px] text-[#0d0d0d]">
                      {MCP_URL}
                    </code>
                    <CopyButton value={MCP_URL} />
                  </div>
                  <CodeBlock code={claudeConfig} label="mcp.json" />
                </div>
              )}
            </div>
          </div>
        </li>

        {/* Step 4 */}
        <li className="rounded-2xl border border-[#e3e3e3] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:p-6">
          <div className="flex gap-3">
            <StepBadge n={4} />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-[#0d0d0d]">Try it</h2>
              <p className="mt-1 text-sm text-[#525252]">
                Paste this into Claude or ChatGPT (with Polykit on). You should get a clear
                BUY / SELL / PASS answer.
              </p>
              <div className="mt-4 rounded-xl border border-[#e3e3e3] bg-[#f7f7f7] p-4">
                <p className="text-sm leading-relaxed text-[#0d0d0d]">{SAMPLE_PROMPT}</p>
                <div className="mt-3">
                  <CopyButton value={SAMPLE_PROMPT} label="Copy prompt" />
                </div>
              </div>
              <p className="mt-3 text-[13px] text-[#737373]">
                After you run it, check{" "}
                <Link href="/dashboard/usage" className="font-medium text-[#006fff] hover:underline">
                  Usage
                </Link>{" "}
                to see the call show up.
              </p>
            </div>
          </div>
        </li>
      </ol>

      {/* Manage keys (collapsed) */}
      <div className="mt-8 border-t border-[#e3e3e3] pt-6">
        <button
          type="button"
          onClick={() => setShowManage((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="text-[13px] font-medium text-[#737373]">Manage keys</span>
          <ChevronDown
            size={16}
            className={`text-[#a3a3a3] transition ${showManage ? "rotate-180" : ""}`}
          />
        </button>
        {showManage && (
          <div className="mt-4">
            {loading ? (
              <p className="text-sm text-[#737373]">Loading…</p>
            ) : keys.length === 0 ? (
              <p className="text-sm text-[#737373]">No keys yet.</p>
            ) : (
              <ul className="divide-y divide-[#e3e3e3] overflow-hidden rounded-xl border border-[#e3e3e3] bg-white">
                {keys.map((k) => (
                  <li
                    key={k.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#0d0d0d]">{k.name}</p>
                      <p className="mt-0.5 text-xs text-[#737373]">{k.keyPrefix}…</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => revoke(k.id)}
                      className="rounded-full p-2 text-[#737373] transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete key"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={createKey}
              disabled={creating || !hasAccess}
              className="mt-3 text-[13px] font-medium text-[#006fff] hover:underline disabled:opacity-50"
            >
              Create another key
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
