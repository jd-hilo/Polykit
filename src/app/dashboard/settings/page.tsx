"use client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUser, useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { CreditCard, LogOut, User, Shield, Bell, Mail } from "lucide-react";
import { analytics } from "@/lib/analytics";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">
        {title}
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#e3e3e3] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
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
      className="flex w-full items-center gap-3.5 border-b border-[#f0f0f0] px-[18px] py-3.5 text-left transition-colors last:border-b-0 hover:bg-[#f7f7f7] disabled:cursor-default disabled:hover:bg-transparent"
    >
      <div
        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] ${
          danger
            ? "bg-red-50 text-red-600"
            : "bg-gradient-to-br from-[#0080ff]/15 to-[#5f61ed]/15 text-[#006fff]"
        }`}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-[14px] font-medium ${danger ? "text-red-600" : "text-[#0d0d0d]"}`}
        >
          {label}
        </div>
        {value && (
          <div className="mt-0.5 truncate text-[12px] text-[#737373]">{value}</div>
        )}
      </div>
      {chevron && onClick && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#a3a3a3"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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
  const [manageUrl, setManageUrl] = useState<string>(
    "https://whop.com/@me/settings/orders/",
  );

  const email = user?.primaryEmailAddress?.emailAddress ?? "–";
  const name = user?.fullName ?? user?.firstName ?? "–";

  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;
    fetch("/api/billing/manage")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { url?: string } | null) => {
        if (!cancelled && data?.url) setManageUrl(data.url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hasAccess]);

  return (
    <div className="mx-auto max-w-[520px] px-6 py-8 md:px-8 md:py-10">
      <Section title="Account">
        <Row icon={User} label={name} value={email} onClick={() => openUserProfile()} />
      </Section>

      <Section title="Subscription">
        <Row
          icon={CreditCard}
          label={hasAccess ? "Polykit MCP · Active" : "Upgrade to MCP access"}
          value={
            hasAccess
              ? "$14/mo · first month $1"
              : "$14/mo · first month $1"
          }
          chevron={false}
        />
        {hasAccess && (
          <>
            <Row
              icon={CreditCard}
              label="Manage Subscription"
              value="Update card, view invoices"
              onClick={() => window.open(manageUrl, "_blank")}
            />
            <Row
              icon={LogOut}
              label="Cancel Subscription"
              value="Cancel anytime, no hassle"
              onClick={() => window.open(manageUrl, "_blank")}
              danger
              chevron={false}
            />
          </>
        )}
        {!hasAccess && (
          <div className="px-[18px] pb-3.5">
            <button
              onClick={async () => {
                analytics.checkoutStarted("settings");
                if (typeof window !== "undefined")
                  localStorage.setItem("ps_checkout_started", "1");
                setBillingLoading(true);
                try {
                  const res = await fetch("/api/stripe/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cancelPath: "/dashboard/settings" }),
                  });
                  const data = (await res.json()) as { url?: string };
                  if (data?.url) window.location.href = data.url;
                } finally {
                  setBillingLoading(false);
                }
              }}
              className="btn-primary btn-primary-sm mt-1 w-full"
              disabled={billingLoading}
            >
              {billingLoading ? "Redirecting…" : "Connect for $1 →"}
            </button>
          </div>
        )}
      </Section>

      <Section title="Notifications">
        <Row
          icon={Bell}
          label="Email notifications"
          value="Managed via your email provider"
          chevron={false}
        />
      </Section>

      <Section title="Security">
        <Row
          icon={Shield}
          label="Password & Security"
          value="Manage via your account profile"
          onClick={() => openUserProfile()}
        />
      </Section>

      <Section title="Support">
        <Row
          icon={Mail}
          label="Contact Support"
          value="hello@hilo.media"
          onClick={() => {
            window.location.href = "mailto:hello@hilo.media";
          }}
        />
      </Section>

      <Section title="Danger Zone">
        <Row
          icon={LogOut}
          label={billingLoading ? "Redirecting…" : "Sign Out"}
          onClick={signOut}
          danger
          chevron={false}
        />
      </Section>

      <p className="mt-8 text-center text-[11px] text-[#a3a3a3]">
        Polykit by Hilo LLC ·{" "}
        <a href="/terms" className="hover:text-[#737373]">
          Terms
        </a>{" "}
        ·{" "}
        <a href="/privacy" className="hover:text-[#737373]">
          Privacy
        </a>
      </p>
    </div>
  );
}
