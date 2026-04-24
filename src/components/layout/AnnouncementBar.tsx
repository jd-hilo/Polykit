"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function AnnouncementBar() {
  const [open, setOpen] = useState(true);
  const [ms, setMs] = useState(13 * 3600000 + 25 * 60000);
  useEffect(() => {
    const id = setInterval(() => setMs(v => Math.max(0, v - 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  const t = `${pad(Math.floor(ms/3600000))}:${pad(Math.floor((ms%3600000)/60000))}:${pad(Math.floor((ms%60000)/1000))}`;
  if (!open) return null;
  return (
    <div className="relative bg-[#235ae9] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2.5 text-center text-[13px]">
        <span className="font-bold">30% off today only.</span>
        <span className="opacity-95">Offer ends 11:59pm tonight:</span>
        <span className="font-mono tabular-nums">{t}</span>
      </div>
      <button onClick={() => setOpen(false)} aria-label="Dismiss" className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-white/10">
        <X size={14} />
      </button>
    </div>
  );
}
