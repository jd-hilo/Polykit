"use client";
import { useEffect, useState } from "react";

// Resets every 3 hours (10,800 seconds), always counting down from where you land.
function getRemaining() {
  return 10800 - (Math.floor(Date.now() / 1000) % 10800);
}

export function UrgencyBanner() {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    setMs(getRemaining() * 1000);
    const id = setInterval(() => setMs(getRemaining() * 1000), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const t = ms === null
    ? "00:00:00"
    : `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor((ms % 3600000) / 60000))}:${pad(Math.floor((ms % 60000) / 1000))}`;

  return (
    <div className="mx-auto max-w-xl px-4 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-[13px] font-medium text-orange-700">
        <span>🔥</span>
        <span>Start for $1 today only. Offer ends:</span>
        <span className="font-mono tabular-nums">{t}</span>
      </div>
    </div>
  );
}
