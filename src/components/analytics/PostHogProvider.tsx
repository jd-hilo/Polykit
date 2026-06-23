"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { Suspense, useEffect } from "react";
import { POSTHOG_PROJECT_TOKEN, POSTHOG_UI_HOST } from "@/lib/posthog-config";
import { PostHogPageView } from "./PostHogPageView";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (posthog.__loaded) return;

    posthog.init(POSTHOG_PROJECT_TOKEN, {
      api_host: "/ingest",
      ui_host: POSTHOG_UI_HOST,
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
      defaults: "2026-01-30",
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
