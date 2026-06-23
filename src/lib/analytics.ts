import posthog from "posthog-js";

function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  posthog.capture(event, properties);
}

export const analytics = {
  ctaClicked(location: string) {
    capture("cta_clicked", { location });
  },

  paywallViewed(variant: "initial" | "return" | "gated" | "oauth_signup", feature?: string) {
    capture("paywall_viewed", { variant, ...(feature ? { feature } : {}) });
  },

  paywallDismissed(variant: "initial" | "return") {
    capture("paywall_dismissed", { variant });
  },

  checkoutStarted(source: string) {
    capture("checkout_started", { source });
  },

  subscriptionActivated() {
    capture("subscription_activated");
  },

  featureGated(feature: string) {
    capture("feature_gated", { feature });
  },

  analysisStarted(props: { mode: "screenshot" | "link"; effort: string; has_access: boolean }) {
    capture("analysis_started", props);
  },

  analysisCompleted(props: {
    mode: "screenshot" | "link";
    effort: string;
    has_access: boolean;
    tier: string;
    pick: string;
    edge: number;
    confidence: number;
    sibling_count: number;
  }) {
    capture("analysis_completed", props);
  },

  analysisFailed(props: { mode: "screenshot" | "link"; error: string }) {
    capture("analysis_failed", props);
  },

  coachMessageSent(props: { is_preset: boolean; label?: string; has_positions: boolean }) {
    capture("coach_message_sent", props);
  },

  positionOpened(props: { side: string; stake: number; market_slug?: string | null }) {
    capture("position_opened", props);
  },

  positionClosed(props: { position_id: string }) {
    capture("position_closed", props);
  },

  walletLookup(props: { position_count: number; success: boolean }) {
    capture("wallet_lookup", props);
  },
};
