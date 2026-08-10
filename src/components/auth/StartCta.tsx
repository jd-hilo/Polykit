"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

const SHOW_DEMO = process.env.NEXT_PUBLIC_ALL_PREM === "1";

const DEMO_LIGHT =
  "inline-flex items-center rounded-full border border-[#006fff]/35 bg-[#eff6ff] px-3.5 py-2 text-[13px] font-semibold text-[#006fff] transition hover:bg-[#dbeafe]";
const DEMO_ON_DARK =
  "inline-flex items-center rounded-full border border-white/30 bg-white/15 px-3.5 py-2 text-[13px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/25";

/** CTA: one label everywhere for prospects, "Open dashboard" when subscribed.
 *  `label` exists for the rare one-off; every site-wide CTA should inherit the
 *  default so the button never says different things on different sections.
 *  When NEXT_PUBLIC_ALL_PREM=1, also shows a Demo shortcut beside it. */
export function StartCta({
  location,
  label = "Connect for $1",
  className = "btn-primary btn-primary-sm",
  showArrow = false,
  onDark = false,
}: {
  location: string;
  /** Prospect-facing button text. Vary per section; never lead with the price. */
  label?: string;
  className?: string;
  showArrow?: boolean;
  /** Use light text Demo button (nav / hero / blue banners). */
  onDark?: boolean;
}) {
  const { hasAccess, openAuth, user } = useAuth();

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={() => openAuth(location)} className={className}>
        {hasAccess ? "Open dashboard" : label}
        {showArrow ? (
          <span className="transition group-hover:translate-x-0.5">→</span>
        ) : null}
      </button>
      {SHOW_DEMO && (
        <Link href={user ? "/dashboard" : "/sign-in"} className={onDark ? DEMO_ON_DARK : DEMO_LIGHT}>
          Demo
        </Link>
      )}
    </span>
  );
}
