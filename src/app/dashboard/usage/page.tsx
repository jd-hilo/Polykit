"use client";
import { useEffect, useState } from "react";

type ToolCall = {
  id: string;
  tool: string;
  status: string;
  latencyMs: number | null;
  inputSummary: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export default function UsagePage() {
  const [calls, setCalls] = useState<ToolCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => (r.ok ? r.json() : { calls: [] }))
      .then((data) => setCalls(data.calls ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <p className="mb-8 text-sm text-[#525252]">
        Recent MCP tool calls from Claude, ChatGPT, and other connectors.
      </p>

      {loading ? (
        <p className="text-sm text-[#737373]">Loading…</p>
      ) : calls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e3e3e3] bg-white px-6 py-12 text-center text-sm text-[#737373]">
          No tool calls yet. Connect your MCP and analyze a market.
        </div>
      ) : (
        <div className="overflow-x-auto overflow-hidden rounded-2xl border border-[#e3e3e3] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-[#e3e3e3] bg-[#f7f7f7] text-xs text-[#737373]">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Tool</th>
                <th className="px-4 py-3 font-medium">Input</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e3e3]">
              {calls.map((c) => (
                <tr key={c.id} className="transition hover:bg-[#f7f7f7]/80">
                  <td className="whitespace-nowrap px-4 py-3 text-[#525252]">
                    {new Date(c.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#0d0d0d]">{c.tool}</td>
                  <td
                    className="max-w-[200px] truncate px-4 py-3 text-[#525252]"
                    title={c.inputSummary ?? ""}
                  >
                    {c.inputSummary ?? "–"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        c.status === "ok"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {c.status}
                    </span>
                    {c.errorMessage && (
                      <p
                        className="mt-0.5 truncate text-xs text-[#a3a3a3]"
                        title={c.errorMessage}
                      >
                        {c.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#737373]">
                    {c.latencyMs != null ? `${(c.latencyMs / 1000).toFixed(1)}s` : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
