"use client";
import {
  Upload,
  Sparkles,
  X,
  AlertCircle,
  RefreshCw,
  Check,
  Minus,
  Link2,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type {
  AnalyzerResponse,
  AnalyzerResult,
  AnalyzerTier,
  SiblingEstimate,
} from "@/lib/analyzer";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const LOADING_SCREENSHOT = [
  "Reading screenshot...",
  "Extracting market data...",
  "Fetching live prices...",
  "Pulling recent news...",
  "Analyzing market question...",
  "Comparing historical patterns...",
  "Checking related markets...",
  "Reasoning through outcomes...",
  "Calculating edge...",
  "Building exit strategy...",
  "Generating prediction...",
  "Finalizing your analysis...",
];

const LOADING_SLUG = [
  "Scanning trending markets...",
  "Pulling live odds...",
  "Checking news & sentiment...",
  "Analyzing probability gaps...",
  "Finding mispriced outcomes...",
  "Cross-referencing related markets...",
  "Evaluating risk vs. reward...",
  "Identifying the sharpest edge...",
  "Running deep analysis...",
  "Locking in the best play...",
  "Finding the best market for you...",
];

type Stage = "idle" | "loading" | "result" | "error";
type Mode = "screenshot" | "link";
type Effort = "low" | "medium" | "high";

const EFFORT_LABEL: Record<Effort, string> = {
  low: "Quick",
  medium: "Balanced",
  high: "Precise",
};

function cycleEffort(e: Effort): Effort {
  if (e === "low") return "medium";
  if (e === "medium") return "high";
  return "low";
}

export default function AIAnalyzerClient() {
  const { hasAccess, openGate } = useAuth();
  const [mode, setMode] = useState<Mode>("screenshot");
  const [effort, setEffort] = useState<Effort>("medium");
  const autoRanRef = useRef(false);
  const [autoPending, setAutoPending] = useState(false);

  // Screenshot state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);

  // Link state
  const [url, setUrl] = useState("");

  // Shared
  const [context, setContext] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [phase, setPhase] = useState(0);
  const [result, setResult] = useState<AnalyzerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadingMessages = mode === "screenshot" ? LOADING_SCREENSHOT : LOADING_SLUG;

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    if (stage !== "loading") return;
    setPhase(0);
    const id = setInterval(() => {
      setPhase((p) => (p + 1) % loadingMessages.length);
    }, 1600);
    return () => clearInterval(id);
  }, [stage, loadingMessages.length]);

  // Prefill from query params — e.g. linked from the Fresh Picks page via
  //   ?slug=will-bitcoin-hit-150k&auto=1
  //   ?url=https%3A%2F%2Fpolymarket.com%2Fevent%2Fwill-xyz
  // If `auto=1` is present, kick off analysis as soon as the URL is in state.
  useEffect(() => {
    if (autoRanRef.current) return;
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const slug = sp.get("slug");
    const urlParam = sp.get("url");
    const incoming = slug
      ? `https://polymarket.com/event/${slug}`
      : urlParam || null;
    if (!incoming) return;
    setMode("link");
    setUrl(incoming);
    autoRanRef.current = true;
    if (sp.get("auto") === "1") {
      setAutoPending(true);
    }
    // Intentionally only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate effect — run analyze() once the url state has actually been
  // committed (React re-render after setUrl) so `analyze()` reads the right URL.
  useEffect(() => {
    if (!autoPending) return;
    if (mode !== "link" || !url.trim()) return;
    setAutoPending(false);
    void analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPending, mode, url]);

  function pickFile(f: File | null) {
    setFileError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!ALLOWED_MIME.includes(f.type.toLowerCase())) {
      setFileError("Only PNG, JPG, or WEBP images are supported.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setFileError("Image must be 8MB or smaller.");
      return;
    }
    setFile(f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHovering(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }

  function resetAll() {
    setFile(null);
    setUrl("");
    setContext("");
    setResult(null);
    setError(null);
    setFileError(null);
    setStage("idle");
    setPhase(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleStripeCheckout() {
    try {
      if (typeof window !== "undefined") localStorage.setItem("ps_checkout_started", "1");
      const cancelPath = typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/dashboard";
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelPath }),
      });
      const data = (await res.json()) as { url?: string };
      if (data?.url) window.location.href = data.url;
    } catch { /* ignore */ }
  }

  async function analyze() {
    setError(null);
    setResult(null);
    setPhase(0);

    const fd = new FormData();
    fd.append("reasoning_effort", effort);
    if (context.trim()) fd.append("context", context.trim());

    if (mode === "screenshot") {
      if (!file) return;
      fd.append("image", file);
    } else {
      if (!url.trim()) return;
      fd.append("url", url.trim());
    }

    setStage("loading");
    try {
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data: AnalyzerResponse = await res.json().catch(() => ({
        ok: false as const,
        error: "Invalid response from server",
      }));
      if (!data.ok) {
        setError(data.error || "Analyzer failed");
        setStage("error");
        return;
      }
      setResult(data.result);
      setStage("result");
    } catch (e) {
      setError((e as Error)?.message || "Network error");
      setStage("error");
    }
  }

  const analyzeDisabled =
    stage === "loading" ||
    (mode === "screenshot" ? !file : !url.trim());

  return (
    <div
      style={{
        backgroundColor: "rgb(255,255,255)",
        padding: 12,
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "OpenSauceOne, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        className="group relative flex flex-1 items-center justify-center"
        style={{
          backgroundColor: "rgba(243,244,246,0.6)",
          borderRadius: 24,
          padding: 32,
          minHeight: 772,
          position: "relative",
        }}
      >
        {/* Inner white card (672px wide) */}
        <div style={{ width: "100%", maxWidth: 672 }}>
          <div
            style={{
              backgroundColor: "rgb(255,255,255)",
              border: "1px solid rgba(229,231,235,0.4)",
              borderRadius: 24,
              padding: 20,
              boxShadow:
                "rgba(0,0,0,0.04) 0px 1px 3px 0px, rgba(0,0,0,0.04) 0px 1px 2px -1px",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 16,
                  fontWeight: 500,
                  color: "rgb(20,24,31)",
                  lineHeight: "24px",
                  margin: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Polykit logo"
                  width={24}
                  height={24}
                  style={{ width: 24, height: 24, borderRadius: 6 }}
                />
                Polykit.io AI analyzer
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <QPToggle effort={effort} onChange={setEffort} disabled={stage === "loading"} />
                <ProBadge />
              </div>
            </div>

            {/* Mode switcher — hidden when showing a result */}
            {stage !== "result" && (
              <ModeSwitcher mode={mode} onChange={setMode} disabled={stage === "loading"} />
            )}

            {/* Body */}
            {stage === "result" && result ? (
              hasAccess ? (
                <ResultView result={result} onReset={resetAll} />
              ) : (
                <div style={{ position: "relative" }}>
                  {/* Blurred, non-copyable result */}
                  <div style={{ filter: "blur(7px)", userSelect: "none", pointerEvents: "none", opacity: 0.85 }}>
                    <ResultView result={result} onReset={resetAll} />
                  </div>
                  {/* Frosted overlay */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingTop: 32,
                    background: "linear-gradient(to top, transparent 0%, rgba(255,255,255,0.6) 35%, rgba(255,255,255,0.97) 65%)",
                  }}>
                    <div style={{ textAlign: "center", maxWidth: 340, padding: "0 16px" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "rgb(20,24,31)", letterSpacing: "-0.01em" }}>
                        AI picked a winning side for you.
                      </div>
                      <div style={{ fontSize: 13, color: "rgb(107,114,128)", marginTop: 6, marginBottom: 14 }}>
                        See what to bet, why, and when to take profits.
                      </div>
                      <button
                        onClick={handleStripeCheckout}
                        className="btn-primary btn-primary-sm"
                      >
                        Get My Winning Edge!
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : stage === "error" ? (
              <ErrorView
                message={error || "Analyzer failed"}
                onRetry={() => {
                  if ((mode === "screenshot" && file) || (mode === "link" && url.trim())) {
                    analyze();
                  } else {
                    resetAll();
                  }
                }}
                onReset={resetAll}
              />
            ) : mode === "screenshot" ? (
              <UploadView
                file={file}
                preview={preview}
                context={context}
                setContext={setContext}
                hovering={hovering}
                setHovering={setHovering}
                inputRef={inputRef}
                onPick={pickFile}
                onRemove={() => {
                  setFile(null);
                  setFileError(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                onDrop={handleDrop}
                fileError={fileError}
                loading={stage === "loading"}
                phase={phase}
                phaseText={loadingMessages[phase]}
                onAnalyze={analyze}
                analyzeDisabled={analyzeDisabled}
              />
            ) : (
              <LinkView
                url={url}
                setUrl={setUrl}
                context={context}
                setContext={setContext}
                loading={stage === "loading"}
                phase={phase}
                phaseText={loadingMessages[phase]}
                onAnalyze={analyze}
                analyzeDisabled={analyzeDisabled}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Header bits ───────────────────────── */

function ProBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 20,
        padding: "0 8px",
        fontSize: 11,
        fontWeight: 600,
        color: "rgb(96,165,250)",
        backgroundColor: "rgba(59,130,246,0.15)",
        border: "1px solid rgba(59,130,246,0.3)",
        borderRadius: 9999,
      }}
    >
      Pro
    </span>
  );
}

function QPToggle({
  effort,
  onChange,
  disabled,
}: {
  effort: Effort;
  onChange: (e: Effort) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(cycleEffort(effort))}
      title={`QP — reasoning_effort: ${effort}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 24,
        padding: "0 10px",
        fontSize: 11,
        fontWeight: 600,
        color: "rgb(36,99,235)",
        backgroundColor: "rgba(36,99,235,0.08)",
        border: "1px solid rgba(36,99,235,0.3)",
        borderRadius: 9999,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          fontSize: 10,
          letterSpacing: "0.4px",
          color: "rgb(36,99,235)",
          fontWeight: 700,
        }}
      >
        QP
      </span>
      <span style={{ fontSize: 11, fontWeight: 500 }}>{EFFORT_LABEL[effort]}</span>
    </button>
  );
}

function ModeSwitcher({
  mode,
  onChange,
  disabled,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  disabled: boolean;
}) {
  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 32,
    fontSize: 12,
    fontWeight: 500,
    color: active ? "rgb(20,24,31)" : "rgb(107,114,128)",
    backgroundColor: active ? "rgb(255,255,255)" : "transparent",
    border: active ? "1px solid rgba(229,231,235,0.8)" : "1px solid transparent",
    boxShadow: active ? "rgba(0,0,0,0.04) 0 1px 2px 0" : "none",
    borderRadius: 10,
    cursor: disabled ? "not-allowed" : "pointer",
  });
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        marginBottom: 12,
        backgroundColor: "rgba(243,244,246,0.6)",
        border: "1px solid rgba(229,231,235,0.6)",
        borderRadius: 12,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("screenshot")}
        style={tabStyle(mode === "screenshot")}
      >
        <ImageIcon size={13} />
        Upload screenshot
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("link")}
        style={tabStyle(mode === "link")}
      >
        <Link2 size={13} />
        Paste Polymarket link
      </button>
    </div>
  );
}

/* ───────────────────────── Upload View (screenshot) ───────────────────────── */

function UploadView(props: {
  file: File | null;
  preview: string | null;
  context: string;
  setContext: (v: string) => void;
  hovering: boolean;
  setHovering: (v: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (f: File | null) => void;
  onRemove: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  fileError: string | null;
  loading: boolean;
  phase: number;
  phaseText: string;
  onAnalyze: () => void;
  analyzeDisabled: boolean;
}) {
  const {
    file,
    preview,
    context,
    setContext,
    hovering,
    setHovering,
    inputRef,
    onPick,
    onRemove,
    onDrop,
    fileError,
    loading,
    phaseText,
    onAnalyze,
    analyzeDisabled,
  } = props;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setHovering(true);
        }}
        onDragLeave={() => setHovering(false)}
        onDrop={onDrop}
        onClick={() => {
          if (!file && !loading) inputRef.current?.click();
        }}
        style={{
          width: "100%",
          minHeight: 160,
          padding: 24,
          textAlign: "center",
          backgroundColor: hovering
            ? "rgba(36,99,235,0.04)"
            : "rgba(243,244,246,0.3)",
          border: hovering
            ? "2px dashed rgba(36,99,235,0.4)"
            : "2px dashed rgba(229,231,235,0.8)",
          borderRadius: 12,
          cursor: file ? "default" : "pointer",
          transition: "border-color 0.2s ease, background-color 0.2s ease",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: "none" }}
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />

        {file && preview ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Screenshot preview"
                style={{
                  maxHeight: 140,
                  maxWidth: "100%",
                  borderRadius: 8,
                  border: "1px solid rgba(229,231,235,0.8)",
                  objectFit: "contain",
                  display: "block",
                }}
              />
              <button
                type="button"
                aria-label="Remove image"
                disabled={loading}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgb(20,24,31)",
                  color: "rgb(255,255,255)",
                  border: "2px solid rgb(255,255,255)",
                  borderRadius: 999,
                  cursor: loading ? "not-allowed" : "pointer",
                  padding: 0,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <X size={12} />
              </button>
            </div>
            <p style={{ fontSize: 11, color: "rgba(107,114,128,0.8)", margin: 0 }}>
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "rgb(107,114,128)", margin: 0 }}>
                Upload a screenshot of any market
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "rgba(107,114,128,0.7)",
                  margin: "4px 0 0 0",
                }}
              >
                Take a screenshot from any prediction market and drop it here
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 32,
                padding: "0 16px",
                fontSize: 12,
                fontWeight: 500,
                color: "rgb(255,255,255)",
                backgroundColor: "rgb(39,39,42)",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <Upload size={12} />
              Browse File
            </button>
          </div>
        )}
      </div>

      {fileError && (
        <div
          style={{
            fontSize: 12,
            color: "rgb(185,28,28)",
            backgroundColor: "rgba(254,226,226,0.6)",
            border: "1px solid rgba(252,165,165,0.6)",
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          {fileError}
        </div>
      )}

      {file && (
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          disabled={loading}
          placeholder="Add any context (e.g. 'this is a Polymarket bet on the Fed rate decision')"
          rows={3}
          style={{
            width: "100%",
            resize: "vertical",
            padding: "10px 12px",
            fontSize: 12,
            lineHeight: "18px",
            fontFamily: "inherit",
            color: "rgb(20,24,31)",
            backgroundColor: "rgb(255,255,255)",
            border: "1px solid rgba(229,231,235,0.8)",
            borderRadius: 12,
            outline: "none",
          }}
        />
      )}

      {loading && <LoadingStrip text={phaseText} />}

      <FindBetButton onClick={onAnalyze} disabled={analyzeDisabled} loading={loading} />
    </div>
  );
}

/* ───────────────────────── Link View ───────────────────────── */

function LinkView(props: {
  url: string;
  setUrl: (v: string) => void;
  context: string;
  setContext: (v: string) => void;
  loading: boolean;
  phase: number;
  phaseText: string;
  onAnalyze: () => void;
  analyzeDisabled: boolean;
}) {
  const { url, setUrl, context, setContext, loading, phaseText, onAnalyze, analyzeDisabled } =
    props;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 24,
          backgroundColor: "rgba(243,244,246,0.3)",
          border: "2px dashed rgba(229,231,235,0.8)",
          borderRadius: 12,
        }}
      >
        <label
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "rgb(20,24,31)",
          }}
        >
          Paste a Polymarket link
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          placeholder="https://polymarket.com/event/will-trump-win-2024"
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 13,
            lineHeight: "18px",
            fontFamily: "inherit",
            color: "rgb(20,24,31)",
            backgroundColor: "rgb(255,255,255)",
            border: "1px solid rgba(229,231,235,0.8)",
            borderRadius: 10,
            outline: "none",
          }}
        />
        <p style={{ fontSize: 11, color: "rgba(107,114,128,0.7)", margin: 0 }}>
          Accepts polymarket.com event/market URLs or a raw slug.
        </p>
      </div>

      {url.trim() && (
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          disabled={loading}
          placeholder="Add any context (optional)"
          rows={2}
          style={{
            width: "100%",
            resize: "vertical",
            padding: "10px 12px",
            fontSize: 12,
            lineHeight: "18px",
            fontFamily: "inherit",
            color: "rgb(20,24,31)",
            backgroundColor: "rgb(255,255,255)",
            border: "1px solid rgba(229,231,235,0.8)",
            borderRadius: 12,
            outline: "none",
          }}
        />
      )}

      {loading && <LoadingStrip text={phaseText} />}

      <FindBetButton onClick={onAnalyze} disabled={analyzeDisabled} loading={loading} />
    </div>
  );
}

function FindBetButton({
  onClick,
  disabled,
  loading,
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        height: 46,
        padding: "12px 24px",
        marginTop: 4,
        fontSize: 14,
        fontWeight: 500,
        color: "rgb(36,99,235)",
        backgroundColor: "rgba(36,99,235,0.05)",
        border: "1px solid rgba(36,99,235,0.3)",
        borderRadius: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Sparkles size={16} />
      <span>{loading ? "Analyzing..." : "Find me the perfect bet"}</span>
    </button>
  );
}

/* ───────────────────────── Loading Strip ───────────────────────── */

function LoadingStrip({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 12,
        border: "1px solid rgba(36,99,235,0.2)",
        backgroundColor: "rgba(36,99,235,0.04)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          border: "2px solid rgba(36,99,235,0.2)",
          borderTopColor: "rgb(36,99,235)",
          animation: "polykit-spin 0.9s linear infinite",
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "rgb(36,99,235)",
          lineHeight: "16px",
        }}
      >
        {text}
      </span>
      <style>{`@keyframes polykit-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ───────────────────────── Error View ───────────────────────── */

function ErrorView({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: 12,
          backgroundColor: "rgba(254,226,226,0.5)",
          border: "1px solid rgba(252,165,165,0.6)",
          borderRadius: 12,
        }}
      >
        <AlertCircle size={16} style={{ color: "rgb(185,28,28)", marginTop: 2 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "rgb(153,27,27)" }}>
            Analysis failed
          </span>
          <span style={{ fontSize: 12, color: "rgb(153,27,27)", opacity: 0.85 }}>{message}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onRetry}
          style={{
            flex: 1,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            color: "rgb(255,255,255)",
            backgroundColor: "rgb(20,24,31)",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} />
          Retry
        </button>
        <button
          type="button"
          onClick={onReset}
          style={{
            flex: 1,
            height: 40,
            fontSize: 13,
            fontWeight: 500,
            color: "rgb(36,99,235)",
            backgroundColor: "rgba(36,99,235,0.05)",
            border: "1px solid rgba(36,99,235,0.3)",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          Start over
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Result View ───────────────────────── */

const TIER_STYLES: Record<AnalyzerTier, { bg: string; fg: string; border: string; label: string }> = {
  high: {
    bg: "rgba(34,197,94,0.12)",
    fg: "rgb(21,128,61)",
    border: "rgba(34,197,94,0.35)",
    label: "High confidence",
  },
  medium: {
    bg: "rgba(245,158,11,0.15)",
    fg: "rgb(161,98,7)",
    border: "rgba(245,158,11,0.4)",
    label: "Medium confidence",
  },
  low: {
    bg: "rgba(107,114,128,0.12)",
    fg: "rgb(75,85,99)",
    border: "rgba(107,114,128,0.3)",
    label: "Low confidence",
  },
};

function pickStyles(pick: AnalyzerResult["pick"], action: AnalyzerResult["action"]) {
  if (action === "PASS") {
    return {
      bg: "rgba(243,244,246,0.9)",
      fg: "rgb(75,85,99)",
      border: "rgba(209,213,219,0.9)",
      icon: <Minus size={16} />,
    };
  }
  if (pick === "Yes") {
    return {
      bg: "rgba(220,252,231,0.9)",
      fg: "rgb(21,128,61)",
      border: "rgba(134,239,172,0.9)",
      icon: <Check size={16} />,
    };
  }
  return {
    bg: "rgba(254,226,226,0.9)",
    fg: "rgb(185,28,28)",
    border: "rgba(252,165,165,0.9)",
    icon: <X size={16} />,
  };
}

function ResultView({ result, onReset }: { result: AnalyzerResult; onReset: () => void }) {
  const tier = TIER_STYLES[result.tier];
  const ps = pickStyles(result.pick, result.action);

  // Normalize edge to "edge on the recommended side" so it's always intuitive:
  // positive = good, negative = bad, regardless of YES/NO.
  // result.edge is signed from the YES perspective, so flip it for NO picks.
  const sideEdge = result.pick === "Yes" ? result.edge : -result.edge;
  const sideEdgePositive = sideEdge > 0.05;
  const sideEdgeNegative = sideEdge < -0.05;
  const edgeColor = sideEdgePositive
    ? "rgb(21,128,61)"
    : sideEdgeNegative
      ? "rgb(185,28,28)"
      : "rgb(107,114,128)";

  // Price of the side we're recommending (market view).
  const pickPrice =
    result.pick === "Yes" ? result.current_price : 100 - result.current_price;
  // Model's fair value of that side.
  const fairPrice = Math.max(0, Math.min(100, Math.round(pickPrice + sideEdge)));

  // Recommended sub-market (for multi-market events)
  const rec = result.recommended_sibling ?? null;
  const recSideFg = rec
    ? rec.side === "Yes" ? "rgb(21,128,61)" : "rgb(185,28,28)"
    : null;
  const recSideBg = rec
    ? rec.side === "Yes" ? "rgba(220,252,231,0.9)" : "rgba(254,226,226,0.9)"
    : null;
  const recSideBorder = rec
    ? rec.side === "Yes" ? "rgba(134,239,172,0.9)" : "rgba(252,165,165,0.9)"
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Recommended sub-market — only for multi-market events */}
      {rec && result.siblings && result.siblings.length > 1 && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(36,99,235,0.2)",
            backgroundColor: "rgba(36,99,235,0.04)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              color: "rgb(36,99,235)",
            }}
          >
            {result.event_title ?? "Best pick in this event"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "rgb(20,24,31)", lineHeight: "20px", flex: 1 }}>
              {rec.question}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 10px",
                fontSize: 12,
                fontWeight: 600,
                color: recSideFg!,
                backgroundColor: recSideBg!,
                border: `1px solid ${recSideBorder}`,
                borderRadius: 9999,
                flexShrink: 0,
              }}
            >
              {rec.side}
            </span>
          </div>
        </div>
      )}

      {/* Verdict pill + confidence tier */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            fontSize: 15,
            fontWeight: 600,
            color: ps.fg,
            backgroundColor: ps.bg,
            border: `1px solid ${ps.border}`,
            borderRadius: 9999,
          }}
        >
          {ps.icon}
          <span>{result.pick}</span>
          <span style={{ opacity: 0.5, fontSize: 12 }}>·</span>
          <span style={{ fontSize: 13, letterSpacing: "0.4px" }}>{result.action}</span>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            color: tier.fg,
            backgroundColor: tier.bg,
            border: `1px solid ${tier.border}`,
            borderRadius: 9999,
          }}
        >
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{result.confidence}%</span>
          <span style={{ opacity: 0.65 }}>·</span>
          <span>{tier.label}</span>
        </div>
      </div>

      {/* Key stats row — market price vs model-predicted price for the recommended side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
        }}
      >
        <StatBox
          label={`Market price (${result.pick})`}
          value={`${pickPrice}¢`}
          sublabel="Polymarket"
        />
        <StatBox
          label={`AI true price (${result.pick})`}
          value={`${fairPrice}¢`}
          valueColor={edgeColor}
          sublabel={`${sideEdgePositive ? "+" : ""}${sideEdge.toFixed(1)}¢ vs market · ${
            sideEdgePositive ? "Underpriced" : sideEdgeNegative ? "Overpriced" : "Fair"
          }`}
        />
      </div>

      {/* Sub-markets table — only shown for multi-market events */}
      {result.siblings && result.siblings.length > 1 && (
        <SiblingsTable
          siblings={result.siblings}
          recommendedSlug={result.recommended_sibling?.slug ?? null}
        />
      )}

      {/* View on Polymarket — outbound link. Polymarket blocks iframe embeds.
          polymarket.com uses /event/<event-slug>, NOT /market/<market-slug>.
          Only render when we have a VERIFIED event slug (set server-side only
          after a Gamma lookup succeeded). If the analyzer couldn't resolve a
          real market — e.g. the screenshot was from Kalshi, or the vision
          step hallucinated a fake slug — show a muted note instead of a
          broken link. */}
      {result.event_slug ? (
        <a
          href={`https://polymarket.com/event/${result.event_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 14px",
            textDecoration: "none",
            color: "rgb(20,24,31)",
            backgroundColor: "rgba(36,99,235,0.04)",
            border: "1px solid rgba(36,99,235,0.25)",
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                display: "grid",
                placeItems: "center",
                borderRadius: 8,
                backgroundColor: "rgba(36,99,235,0.12)",
                color: "rgb(36,99,235)",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              P
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>View on Polymarket</span>
              <span
                style={{
                  fontSize: 11,
                  color: "rgb(107,114,128)",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                {result.event_slug}
              </span>
            </div>
          </div>
          <Link2 size={16} style={{ color: "rgb(36,99,235)" }} />
        </a>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "rgb(107,114,128)",
            backgroundColor: "rgba(243,244,246,0.6)",
            border: "1px solid rgba(229,231,235,0.8)",
            borderRadius: 10,
          }}
        >
          <AlertCircle size={14} style={{ color: "rgb(107,114,128)", flexShrink: 0 }} />
          <span>No matching live Polymarket market found for this question.</span>
        </div>
      )}

      {/* Reasons — numbered */}
      <div>
        <SectionLabel>Why</SectionLabel>
        <ol
          style={{
            margin: "6px 0 0 0",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {result.reasons.map((r, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: 10,
                fontSize: 13,
                lineHeight: "19px",
                color: "rgb(20,24,31)",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgb(36,99,235)",
                  backgroundColor: "rgba(36,99,235,0.1)",
                  border: "1px solid rgba(36,99,235,0.2)",
                }}
              >
                {i + 1}
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Key risks — warning list */}
      {result.key_risks.length > 0 && (
        <div>
          <SectionLabel>Key risks</SectionLabel>
          <ul
            style={{
              margin: "6px 0 0 0",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {result.key_risks.map((r, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "8px 10px",
                  fontSize: 12,
                  lineHeight: "18px",
                  color: "rgb(146,64,14)",
                  backgroundColor: "rgba(251,191,36,0.1)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: 10,
                }}
              >
                <AlertTriangle
                  size={14}
                  style={{ color: "rgb(217,119,6)", marginTop: 2, flexShrink: 0 }}
                />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          height: 46,
          marginTop: 4,
          fontSize: 14,
          fontWeight: 500,
          color: "rgb(36,99,235)",
          backgroundColor: "rgba(36,99,235,0.05)",
          border: "1px solid rgba(36,99,235,0.3)",
          borderRadius: 12,
          cursor: "pointer",
        }}
      >
        <Sparkles size={16} />
        New analysis
      </button>
    </div>
  );
}

function StatBox({
  label,
  value,
  valueColor,
  sublabel,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sublabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "10px 12px",
        border: "1px solid rgba(229,231,235,0.8)",
        borderRadius: 10,
        backgroundColor: "rgba(248,250,252,0.5)",
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "rgb(107,114,128)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: valueColor ?? "rgb(20,24,31)",
          lineHeight: "22px",
        }}
      >
        {value}
      </span>
      {sublabel && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "rgb(107,114,128)",
            lineHeight: "14px",
          }}
        >
          {sublabel}
        </span>
      )}
    </div>
  );
}

// BestPickBlock removed — sub-market shown inline in "Market" section.
function _BestPickBlock({
  recommended,
  eventTitle,
}: {
  recommended: import("@/lib/analyzer").RecommendedSibling;
  eventTitle: string | null;
}) {
  const edge = recommended.edge_cents;
  const edgePositive = edge > 0.05;
  const edgeNegative = edge < -0.05;
  const edgeColor = edgePositive
    ? "rgb(21,128,61)"
    : edgeNegative
      ? "rgb(185,28,28)"
      : "rgb(107,114,128)";
  const sideBg =
    recommended.side === "Yes" ? "rgba(220,252,231,0.9)" : "rgba(254,226,226,0.9)";
  const sideFg = recommended.side === "Yes" ? "rgb(21,128,61)" : "rgb(185,28,28)";
  const sideBorder =
    recommended.side === "Yes" ? "rgba(134,239,172,0.9)" : "rgba(252,165,165,0.9)";
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(36,99,235,0.25)",
        backgroundColor: "rgba(36,99,235,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          color: "rgb(36,99,235)",
        }}
      >
        Best pick within this event
      </span>
      {eventTitle && (
        <span style={{ fontSize: 11, color: "rgb(107,114,128)" }}>{eventTitle}</span>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "rgb(20,24,31)",
            lineHeight: "22px",
          }}
        >
          {recommended.question}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 10px",
            fontSize: 12,
            fontWeight: 600,
            color: sideFg,
            backgroundColor: sideBg,
            border: `1px solid ${sideBorder}`,
            borderRadius: 9999,
          }}
        >
          {recommended.side}
        </span>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap" }}>
        <span style={{ color: "rgb(107,114,128)" }}>
          Market{" "}
          <strong style={{ color: "rgb(20,24,31)", fontVariantNumeric: "tabular-nums" }}>
            {recommended.market_price_cents}¢
          </strong>
        </span>
        <span style={{ color: "rgb(107,114,128)" }}>
          AI fair{" "}
          <strong style={{ color: "rgb(20,24,31)", fontVariantNumeric: "tabular-nums" }}>
            {recommended.fair_price_cents}¢
          </strong>
        </span>
        <span style={{ color: edgeColor, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {edge > 0 ? "+" : ""}
          {edge.toFixed(1)}¢ edge
        </span>
      </div>
    </div>
  );
}

function SiblingsTable({
  siblings,
  recommendedSlug,
}: {
  siblings: SiblingEstimate[];
  recommendedSlug: string | null;
}) {
  // Sort by absolute edge desc so the most interesting rows are on top.
  const sorted = siblings.slice().sort((a, b) => Math.abs(b.edge_cents) - Math.abs(a.edge_cents));
  return (
    <div>
      <SectionLabel>All sub-markets in this event</SectionLabel>
      <div
        style={{
          marginTop: 6,
          border: "1px solid rgba(229,231,235,0.8)",
          borderRadius: 10,
          overflow: "hidden",
          backgroundColor: "rgb(255,255,255)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 64px 64px 64px",
            gap: 0,
            padding: "8px 12px",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "rgb(107,114,128)",
            backgroundColor: "rgba(243,244,246,0.5)",
            borderBottom: "1px solid rgba(229,231,235,0.8)",
          }}
        >
          <span>Sub-market</span>
          <span style={{ textAlign: "right" }}>Mkt YES</span>
          <span style={{ textAlign: "right" }}>AI fair</span>
          <span style={{ textAlign: "right" }}>Edge</span>
        </div>
        {sorted.map((s) => {
          const isRec = s.slug === recommendedSlug;
          const edgeColor = "rgb(21,128,61)";
          return (
            <div
              key={s.slug}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 64px 64px 64px",
                gap: 0,
                padding: "8px 12px",
                fontSize: 12,
                backgroundColor: isRec ? "rgba(36,99,235,0.06)" : "transparent",
                borderLeft: isRec ? "3px solid rgb(36,99,235)" : "3px solid transparent",
                borderBottom: "1px solid rgba(229,231,235,0.5)",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "rgb(20,24,31)",
                  fontWeight: isRec ? 600 : 400,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={s.question}
              >
                {isRec ? "★ " : ""}
                {s.question}
              </span>
              <span
                style={{
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  color: "rgb(20,24,31)",
                }}
              >
                {s.market_price_cents}¢
              </span>
              <span
                style={{
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  color: "rgb(20,24,31)",
                }}
              >
                {s.fair_yes_cents}¢
              </span>
              <span
                style={{
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  color: edgeColor,
                  fontWeight: 600,
                }}
              >
                {s.edge_cents > 0 ? "+" : ""}
                {s.edge_cents.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color: "rgb(107,114,128)",
        lineHeight: "16px",
      }}
    >
      {children}
    </span>
  );
}
