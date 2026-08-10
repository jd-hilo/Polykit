"use client";
import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export function AnnouncementBar() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="relative bg-[#235ae9] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2.5 text-center text-[13px]">
        <span className="font-medium">Polykit is now a Polymarket MCP for Claude &amp; ChatGPT.</span>
        <Link href="/mcp" className="font-semibold underline underline-offset-2 hover:opacity-90">
          See setup →
        </Link>
      </div>
      <button onClick={() => setOpen(false)} aria-label="Dismiss" className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-white/10">
        <X size={14} />
      </button>
    </div>
  );
}
