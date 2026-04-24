"use client";
import { useEffect, useState } from "react";

const WINS = [
  { name: "Sarah K.", loc: "Los Angeles, CA", amount: 423, mins: 15 },
  { name: "Tyler H.", loc: "Phoenix, AZ", amount: 612, mins: 30 },
  { name: "Amanda C.", loc: "Portland, OR", amount: 2891, mins: 5 },
  { name: "Mike T.", loc: "Chicago, IL", amount: 2319, mins: 17 },
  { name: "Emma R.", loc: "Miami, FL", amount: 756, mins: 38 },
  { name: "David L.", loc: "Austin, TX", amount: 4182, mins: 42 },
  { name: "Jessica W.", loc: "Seattle, WA", amount: 291, mins: 36 },
];

export function LiveWinPopup() {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setShow(false);
      setTimeout(() => { setI(v => (v + 1) % WINS.length); setShow(true); }, 300);
    }, 6500);
    return () => clearInterval(id);
  }, []);
  const w = WINS[i];
  return (
    <div className={`fixed bottom-6 left-6 z-30 max-w-[280px] transition-all duration-300 ${show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1e3a8a]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 17 9 11 13 15 21 7" />
            <polyline points="15 7 21 7 21 13" />
          </svg>
        </span>
        <div className="min-w-0 text-xs leading-tight">
          <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-foreground">{w.name} from {w.loc}</span>
          <div className="mt-1 text-foreground">Won <span className="font-semibold text-[#235ae9]">${w.amount.toLocaleString()}</span> on their bet</div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            {w.mins} minutes ago
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#3b82f6" className="ml-0.5"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>verified by Proof</span>
          </div>
        </div>
      </div>
    </div>
  );
}
