"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: React.ReactNode; className?: string; }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-8 max-h-[90vh] overflow-y-auto scrollbar-hide", className)}>
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted">
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
