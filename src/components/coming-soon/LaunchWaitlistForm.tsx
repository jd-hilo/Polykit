"use client";

import { useState } from "react";
import { analytics } from "@/lib/analytics";

type Status = "idle" | "loading" | "success" | "error";

export default function LaunchWaitlistForm() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot — humans never see it
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/launch-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Something went wrong");
      }
      setStatus("success");
      analytics.launchWaitlistJoined({ source: "coming_soon" });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-[14px] border border-white bg-white px-8 py-3.5 text-base font-semibold text-[#235ae9] shadow-[rgba(6,35,84,0.3)_0_2px_8px_0]">
        You&apos;re on the list — we&apos;ll email you when MCP access opens.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        {/* Honeypot — hidden from humans, tempting to bots */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          className="min-w-0 flex-1 rounded-[14px] border border-white/60 bg-white/95 px-5 py-3 text-base font-medium text-[#0f172a] placeholder-slate-400 shadow-[rgba(6,35,84,0.15)_0_2px_8px_0] outline-none transition focus:border-white focus:ring-2 focus:ring-white/60"
        />
        <button type="submit" disabled={status === "loading"} className="btn-hero shrink-0">
          {status === "loading" ? "Joining…" : "Get early access"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      {status === "error" && (
        <p className="mt-3 text-center text-sm font-medium text-white">{error}</p>
      )}
    </form>
  );
}
