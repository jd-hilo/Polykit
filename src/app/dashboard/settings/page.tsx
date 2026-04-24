"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUser, useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { CreditCard, LogOut, User, Shield, Bell } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgb(107,114,128)", marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ borderRadius: 16, border: "1px solid rgb(229,231,235)", overflow: "hidden", backgroundColor: "rgb(255,255,255)" }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  onClick,
  danger,
  chevron = true,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  chevron?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderBottom: "1px solid rgb(243,244,246)",
        background: "transparent",
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
        fontFamily: "inherit",
      }}
      className="hover:bg-gray-50 transition-colors last:border-b-0"
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: danger ? "rgba(239,68,68,0.08)" : "rgba(36,99,235,0.07)",
      }}>
        <Icon size={16} style={{ color: danger ? "rgb(220,38,38)" : "rgb(36,99,235)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: danger ? "rgb(220,38,38)" : "rgb(20,24,31)" }}>{label}</div>
        {value && <div style={{ fontSize: 12, color: "rgb(107,114,128)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>}
      </div>
      {chevron && onClick && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(156,163,175)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </button>
  );
}

export default function SettingsPage() {
  const { signOut, hasAccess } = useAuth();
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const [billingLoading, setBillingLoading] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress ?? "—";
  const name = user?.fullName ?? user?.firstName ?? "—";

  async function openBillingPortal() {
    try {
      setBillingLoading(true);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data?.url) window.location.href = data.url;
    } finally {
      setBillingLoading(false);
    }
  }

  return (
    <div style={{ padding: "0 32px 48px", maxWidth: 520, margin: "0 auto" }}>
      <div style={{ height: 52, paddingTop: 12, marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "rgb(20,24,31)", margin: 0 }}>Settings</h1>
      </div>

      {/* Account */}
      <Section title="Account">
        <Row icon={User} label={name} value={email} onClick={() => openUserProfile()} />
      </Section>

      {/* Subscription */}
      <Section title="Subscription">
        <Row
          icon={CreditCard}
          label={hasAccess ? "Polykit All Access — Active" : "Upgrade to Pro"}
          value={hasAccess ? "$1 first month, then $39/mo" : "$1 first month — then $39/mo"}
          chevron={false}
        />
        {hasAccess && (
          <>
            <Row
              icon={CreditCard}
              label="Manage Subscription"
              value="Update card, view invoices"
              onClick={() => window.open("https://whop.com/manage", "_blank")}
            />
            <Row
              icon={LogOut}
              label="Cancel Subscription"
              value="Cancel anytime — no hassle"
              onClick={() => window.open("https://whop.com/manage", "_blank")}
              danger
              chevron={false}
            />
          </>
        )}
        {!hasAccess && (
          <div style={{ padding: "0 18px 14px" }}>
            <button
              onClick={async () => {
                const res = await fetch("/api/stripe/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ cancelPath: "/dashboard/settings" }),
                });
                const data = (await res.json()) as { url?: string };
                if (data?.url) window.location.href = data.url;
              }}
              className="btn-primary btn-primary-sm w-full mt-1"
              style={{ width: "100%" }}
            >
              Start for $1 →
            </button>
          </div>
        )}
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row icon={Bell} label="Email notifications" value="Managed via your email provider" chevron={false} />
      </Section>

      {/* Security */}
      <Section title="Security">
        <Row icon={Shield} label="Password & Security" value="Manage via your account profile" onClick={() => openUserProfile()} />
      </Section>

      {/* Danger */}
      <Section title="Danger Zone">
        <Row icon={LogOut} label={billingLoading ? "Redirecting…" : "Sign Out"} onClick={signOut} danger chevron={false} />
      </Section>

      <p style={{ fontSize: 11, color: "rgb(156,163,175)", textAlign: "center", marginTop: 32 }}>
        Polykit by Hilo LLC · <a href="/terms" style={{ color: "rgb(156,163,175)" }}>Terms</a> · <a href="/privacy" style={{ color: "rgb(156,163,175)" }}>Privacy</a>
      </p>
    </div>
  );
}
