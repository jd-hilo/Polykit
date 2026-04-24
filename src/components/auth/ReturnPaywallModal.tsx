"use client";
import { useState } from "react";
import { Modal } from "./Modal";

export function ReturnPaywallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    try {
      setLoading(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("ps_checkout_started", "1");
      }
      const cancelPath = typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/dashboard";
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelPath }),
      });
      const data = (await res.json()) as { url?: string };
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "rgb(20,24,31)",
            margin: 0,
          }}
        >
          Still thinking it over?
        </h2>
        <p
          style={{
            marginTop: 12,
            fontSize: 14,
            color: "rgb(75,85,99)",
            lineHeight: "20px",
          }}
        >
          The best investment you&apos;ll make is{" "}
          <span style={{ fontWeight: 700, color: "rgb(20,24,31)" }}>betting on yourself</span>.
        </p>

        <div
          style={{
            marginTop: 16,
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid rgba(229,231,235,0.9)",
            backgroundColor: "rgba(243,244,246,0.5)",
            fontSize: 13,
            color: "rgb(55,65,81)",
            fontWeight: 500,
          }}
        >
          Every day without an edge is money left on the table.
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading}
          style={{
            width: "100%",
            height: 48,
            marginTop: 20,
            fontSize: 15,
            fontWeight: 700,
            color: "white",
            backgroundColor: "rgb(36,99,235)",
            border: "none",
            borderRadius: 12,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            fontFamily: "inherit",
          }}
        >
          {loading ? "Redirecting…" : "Upgrade"}
        </button>

        <button
          onClick={onClose}
          style={{
            marginTop: 12,
            background: "transparent",
            border: "none",
            color: "rgb(156,163,175)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          No thanks, I&apos;ll pass
        </button>
      </div>
    </Modal>
  );
}
