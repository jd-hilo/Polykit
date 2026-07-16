"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Trash2 } from "lucide-react";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export default function KeysPage() {
  const { hasAccess, openAuth } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/keys");
      const text = await res.text();
      const data = text ? (JSON.parse(text) as { keys?: ApiKeyRow[]; error?: string }) : {};
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
      openAuth("keys");
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
      setNewKey(data.key ?? null);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    await load();
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-[#525252]">
          API keys authenticate MCP requests. Store them securely. We only show the full key
          once.
        </p>
        <button
          onClick={createKey}
          disabled={creating}
          className="btn-primary btn-primary-md disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create key"}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {newKey && (
        <div className="relative mb-8 overflow-hidden rounded-2xl">
          <div aria-hidden className="supaste-banner absolute inset-0" />
          <div className="relative p-6">
            <p className="text-sm font-semibold text-white">Copy your API key now</p>
            <p className="mt-1 text-xs text-white/75">You won&apos;t be able to see it again.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <code className="flex-1 break-all rounded-xl border border-white/25 bg-white/15 px-3 py-2.5 font-mono text-sm text-white backdrop-blur-sm">
                {newKey}
              </code>
              <button
                onClick={copyKey}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#006fff]"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="mt-4 text-xs text-white/70 underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#737373]">Loading…</p>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e3e3e3] bg-white px-6 py-12 text-center">
          <p className="text-sm text-[#737373]">No API keys yet.</p>
          <button onClick={createKey} className="btn-primary btn-primary-sm mt-4">
            Create your first key
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#e3e3e3] overflow-hidden rounded-2xl border border-[#e3e3e3] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#0d0d0d]">{k.name}</p>
                <p className="mt-0.5 font-mono text-xs text-[#737373]">{k.keyPrefix}</p>
                <p className="mt-1 text-xs text-[#a3a3a3]">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt &&
                    ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => revoke(k.id)}
                className="rounded-full p-2.5 text-[#737373] transition hover:bg-red-50 hover:text-red-600"
                aria-label="Revoke key"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
