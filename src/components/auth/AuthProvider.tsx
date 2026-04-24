"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { PaywallModal } from "./PaywallModal";
import { ReturnPaywallModal } from "./ReturnPaywallModal";

type User = { email: string; id: string };
type AuthState = {
  user: User | null;
  hasAccess: boolean;
  subscriptionLoaded: boolean;
  openAuth: () => void;
  openPaywall: () => void;
  openReturnPaywall: () => void;
  openGate: () => void;
  refetchSubscription: () => void;
  signOut: () => void;
};

const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { openSignIn, signOut: clerkSignOut } = useClerk();

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [upgradeToastVisible, setUpgradeToastVisible] = useState(false);

  const user = useMemo<User | null>(() => {
    if (!isLoaded || !clerkUser) return null;
    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
    };
  }, [isLoaded, clerkUser]);

  const refetchSubscription = useCallback(() => {
    fetch("/api/subscription/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { hasAccess?: boolean }) => {
        setHasAccess(d.hasAccess === true);
        setSubscriptionLoaded(true);
      })
      .catch(() => {
        setHasAccess(false);
        setSubscriptionLoaded(true);
      });
  }, []);

  // Fetch subscription status when clerkUser changes
  useEffect(() => {
    if (!clerkUser) {
      setHasAccess(false);
      setSubscriptionLoaded(true);
      return;
    }
    fetch("/api/subscription/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { hasAccess?: boolean }) => {
        setHasAccess(d.hasAccess === true);
        setSubscriptionLoaded(true);
      })
      .catch(() => {
        setHasAccess(false);
        setSubscriptionLoaded(true);
      });
  }, [clerkUser]);

  // Auto-fire PaywallModal after new Google/Apple signup (within 2 min)
  useEffect(() => {
    if (!clerkUser || !isLoaded || !subscriptionLoaded) return;
    if (hasAccess) return;
    const createdAt = clerkUser.createdAt ? new Date(clerkUser.createdAt).getTime() : 0;
    const isNew = Date.now() - createdAt < 120_000;
    const isOAuth = clerkUser.externalAccounts.length > 0;
    const alreadySeen =
      typeof window !== "undefined" && localStorage.getItem("pk_offer_seen") === "1";
    if (isNew && isOAuth && !alreadySeen) {
      if (typeof window !== "undefined") localStorage.setItem("pk_offer_seen", "1");
      setPaywallOpen(true);
    }
  }, [clerkUser, isLoaded, subscriptionLoaded, hasAccess]);

  // Detect ?upgraded=1 on mount (post-purchase) and ?canceled=1 (checkout canceled)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("upgraded") === "1") {
      url.searchParams.delete("upgraded");
      window.history.replaceState({}, "", url.toString());
      localStorage.removeItem("ps_checkout_started");
      setHasAccess(true);
      setUpgradeToastVisible(true);
      setTimeout(() => setUpgradeToastVisible(false), 5000);
    }
    if (url.searchParams.get("canceled") === "1") {
      url.searchParams.delete("canceled");
      window.history.replaceState({}, "", url.toString());
      localStorage.removeItem("ps_checkout_started");
      setReturnOpen(true);
    }
  }, []);

  const openAuth = useCallback(() => {
    if (user) {
      if (typeof window !== "undefined") window.location.href = "/dashboard";
      return;
    }
    openSignIn({
      fallbackRedirectUrl: "/dashboard",
      signUpFallbackRedirectUrl: "/dashboard",
    });
  }, [openSignIn, user]);

  const openGate = useCallback(() => {
    const alreadySeen =
      typeof window !== "undefined" && localStorage.getItem("pk_offer_seen") === "1";
    if (alreadySeen) {
      setReturnOpen(true);
    } else {
      setPaywallOpen(true);
    }
  }, []);

  const signOut = useCallback(() => {
    void clerkSignOut();
  }, [clerkSignOut]);

  const api = useMemo<AuthState>(
    () => ({
      user,
      hasAccess,
      subscriptionLoaded,
      openAuth,
      openPaywall: () => setPaywallOpen(true),
      openReturnPaywall: () => setReturnOpen(true),
      openGate,
      refetchSubscription,
      signOut,
    }),
    [user, hasAccess, subscriptionLoaded, openAuth, openGate, refetchSubscription, signOut]
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {upgradeToastVisible && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 200,
            padding: "14px 20px",
            borderRadius: 12,
            backgroundColor: "rgb(21,128,61)",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>✓</span>
          <span>Subscription activated! You now have full access.</span>
        </div>
      )}
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
      <ReturnPaywallModal open={returnOpen} onClose={() => setReturnOpen(false)} />
    </Ctx.Provider>
  );
}
