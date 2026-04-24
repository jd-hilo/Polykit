"use client";
import { useState } from "react";
import { Modal } from "./Modal";
import { Eye, EyeOff, Star } from "lucide-react";

export function AuthModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: (email: string) => void; }) {
  const [step, setStep] = useState<"start" | "password">("start");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  return (
    <Modal open={open} onClose={() => { onClose(); setStep("start"); }}>
      <div className="text-center">
        <div className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">✓ Trusted by 21,000+ traders</div>
        <h2 className="text-2xl font-bold tracking-tight">Let&apos;s Get You Winning</h2>
        <p className="mt-2 text-sm text-muted-foreground">Get AI analysis on any market in seconds.</p>
      </div>

      {step === "start" ? (
        <div className="mt-6 space-y-3">
          <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium hover:bg-muted">
            <GoogleIcon /> Continue with Google
          </button>
          <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-black px-4 py-3 text-sm font-medium text-white hover:bg-black/90">
            <AppleIcon /> Continue with Apple
          </button>
          <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>
          <input
            value={email} onChange={(e) => setEmail(e.target.value)}
            type="email" placeholder="Enter your email"
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => email.includes("@") && setStep("password")}
            className="btn-primary w-full">Continue with Email</button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="rounded-xl bg-muted/60 px-4 py-2 text-xs text-muted-foreground">{email}</div>
          <div className="relative">
            <input
              value={pw} onChange={(e) => setPw(e.target.value)}
              type={showPw ? "text" : "password"} placeholder="Enter your password"
              className="w-full rounded-xl border border-border bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-primary"
            />
            <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" type="button">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="flex justify-end"><button className="text-xs text-primary hover:underline">Forgot password?</button></div>
          <button onClick={() => pw.length >= 4 && onSuccess(email)} className="btn-primary w-full">Continue</button>
        </div>
      )}

      <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <div className="flex text-yellow-400">{Array.from({length:5}).map((_,i)=><Star key={i} size={12} fill="currentColor" />)}</div>
        <span>4.9/5</span><span>•</span><span>verified by Proof</span>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">By continuing you agree to our Terms &amp; Privacy.</p>
    </Modal>
  );
}

function GoogleIcon() { return (
  <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.2 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.2 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.8 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-8L6 33c3.3 6.6 10 11 18 11z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41 35 44 30 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
); }
function AppleIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.9c0-2.3 1.9-3.4 2-3.4-1.1-1.6-2.8-1.9-3.4-1.9-1.5-.2-2.8.8-3.5.8-.7 0-1.9-.8-3.1-.8-1.6 0-3 .9-3.9 2.3-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.8 2.4 3 2.4 1.2-.1 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.8 1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.7-3.9zm-2.3-7.2c.7-.8 1.1-1.9 1-3.1-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.9-1 3 1.1.1 2.1-.5 2.8-1.3z"/></svg>); }
