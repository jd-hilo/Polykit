"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { analytics } from "@/lib/analytics";
import { PaywallModal } from "./PaywallModal";
import { ReturnPaywallModal } from "./ReturnPaywallModal";

type User = { email: string; id: string };
type AuthState = {
  user: User | null;
  hasAccess: boolean;
  subscriptionLoaded: boolean;
  openAuth: (location?: string) => void;
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
  const justUpgraded = useRef(false);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [upgradeToastVisible, setUpgradeToastVisible] = useState(false);

  const user = useMemo<User | null>(() => {
    if (!isLoaded || !clerkUser) return null;
    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
    };
  }, [isLoaded, clerkUser]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) {
      posthog.reset();
      return;
    }
    posthog.identify(clerkUser.id, {
      email: clerkUser.primaryEmailAddress?.emailAddress,
      name: clerkUser.fullName,
      has_access: hasAccess,
    });
  }, [isLoaded, clerkUser, hasAccess]);

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

  // Fetch subscription status when clerkUser changes.
  // Skip overwriting if user just came back from a successful checkout.
  useEffect(() => {
    if (!clerkUser) {
      setHasAccess(false);
      setSubscriptionLoaded(true);
      return;
    }
    if (justUpgraded.current) {
      // They just paid — trust the ?upgraded=1 flag, don't let a slow
      // Whop API sync overwrite hasAccess. Clear the flag after 30s.
      setTimeout(() => { justUpgraded.current = false; }, 30_000);
      return;
    }
    fetch("/api/subscription/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { hasAccess?: boolean }) => {
        if (!justUpgraded.current) {
          setHasAccess(d.hasAccess === true);
        }
        setSubscriptionLoaded(true);
      })
      .catch(() => {
        if (!justUpgraded.current) setHasAccess(false);
        setSubscriptionLoaded(true);
      });
  }, [clerkUser]);

  // Auto-fire PaywallModal after new Google/Apple signup (within 2 min).
  // Re-verifies hasAccess server-side right before opening to avoid showing
  // the modal to users whose webhook hasn't finished writing the DB row yet.
  useEffect(() => {
    if (!clerkUser || !isLoaded || !subscriptionLoaded) return;
    if (hasAccess) return;
    if (justUpgraded.current) return;
    // Defense-in-depth: if the URL signals a return from checkout, never
    // pop the upsell modal in this session.
    if (typeof window !== "undefined") {
      const sp = new URL(window.location.href).searchParams;
      if (sp.get("upgraded") === "1" || sp.get("checkout") === "success") return;
    }
    const createdAt = clerkUser.createdAt ? new Date(clerkUser.createdAt).getTime() : 0;
    const isNew = Date.now() - createdAt < 120_000;
    const isOAuth = clerkUser.externalAccounts.length > 0;
    const alreadySeen =
      typeof window !== "undefined" && localStorage.getItem("pk_offer_seen") === "1";
    if (!isNew || !isOAuth || alreadySeen) return;

    // Re-verify access on the server one more time before opening — the
    // initial fetch may have raced ahead of a slow Whop webhook.
    let cancelled = false;
    fetch("/api/subscription/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { hasAccess?: boolean }) => {
        if (cancelled) return;
        if (d.hasAccess === true) {
          setHasAccess(true);
          return;
        }
        if (typeof window !== "undefined") localStorage.setItem("pk_offer_seen", "1");
        analytics.paywallViewed("oauth_signup");
        setPaywallOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        if (typeof window !== "undefined") localStorage.setItem("pk_offer_seen", "1");
        analytics.paywallViewed("oauth_signup");
        setPaywallOpen(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clerkUser, isLoaded, subscriptionLoaded, hasAccess]);

  // Detect ?upgraded=1 on mount (post-purchase) and ?canceled=1 (checkout canceled)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("upgraded") === "1") {
      url.searchParams.delete("upgraded");
      window.history.replaceState({}, "", url.toString());
      localStorage.removeItem("ps_checkout_started");
      justUpgraded.current = true;
      setHasAccess(true);
      setSubscriptionLoaded(true);
      analytics.subscriptionActivated();
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

  // Whop checkout: detect "came back from checkout without upgrading".
  // We set `ps_checkout_started=1` before redirecting to Whop. When the user
  // returns (bfcache restore, back button, tab refocus) still without access,
  // show the return paywall modal.
  useEffect(() => {
    if (typeof window === "undefined") return;

    function checkReturnFromCheckout() {
      if (localStorage.getItem("ps_checkout_started") !== "1") return;
      // Let the subscription refetch win if they actually upgraded.
      if (hasAccess || justUpgraded.current) {
        localStorage.removeItem("ps_checkout_started");
        return;
      }
      // If the URL still carries the post-checkout signal, do NOT pop the
      // return modal — the webhook may just be lagging by a few seconds.
      const sp = new URL(window.location.href).searchParams;
      if (sp.get("upgraded") === "1" || sp.get("checkout") === "success") {
        localStorage.removeItem("ps_checkout_started");
        return;
      }
      localStorage.removeItem("ps_checkout_started");
      // Re-check subscription. Poll briefly to give the webhook time to land
      // before showing "you didn't subscribe" — webhook can take 5–10s under load.
      const start = Date.now();
      const poll = () => {
        fetch("/api/subscription/status", { cache: "no-store" })
          .then((r) => r.json())
          .then((d: { hasAccess?: boolean }) => {
            if (d.hasAccess === true) {
              setHasAccess(true);
              return;
            }
            if (Date.now() - start < 8000) {
              setTimeout(poll, 1500);
            } else {
              setReturnOpen(true);
            }
          })
          .catch(() => {
            if (Date.now() - start < 8000) setTimeout(poll, 1500);
            else setReturnOpen(true);
          });
      };
      poll();
    }

    // Fires on bfcache restore (back button from Whop on mobile/desktop).
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) checkReturnFromCheckout();
    };
    // Fires when the tab regains focus (desktop: user closes Whop tab / clicks back).
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkReturnFromCheckout();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hasAccess]);

  const openAuth = useCallback((location = "unknown") => {
    analytics.ctaClicked(location);
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
      analytics.paywallViewed("return");
      setReturnOpen(true);
    } else {
      analytics.paywallViewed("initial");
      setPaywallOpen(true);
    }
  }, []);

  const signOut = useCallback(() => {
    posthog.capture("user_signed_out");
    posthog.reset();
    void clerkSignOut();
  }, [clerkSignOut]);

  const api = useMemo<AuthState>(
    () => ({
      user,
      hasAccess,
      subscriptionLoaded,
      openAuth,
      openPaywall: () => {
        analytics.paywallViewed("initial");
        setPaywallOpen(true);
      },
      openReturnPaywall: () => {
        analytics.paywallViewed("return");
        setReturnOpen(true);
      },
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
