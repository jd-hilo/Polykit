import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

// Coming-soon mode: the teaser at / is the only page anyone (authed or not)
// can see. Flip off by removing COMING_SOON=1 from the environment.
const COMING_SOON = process.env.COMING_SOON === "1";

const isAllowedInComingSoon = createRouteMatcher([
  "/coming-soon", // rewrite target — must be allowlisted or / loops
  "/contact",
  "/privacy",
  "/terms",
  "/robots.txt",
  "/sitemap.xml",
  "/api/launch-waitlist",
  "/api/webhooks(.*)", // Whop webhook must stay reachable
  "/api/stripe/webhook",
  "/api/subscription/status", // AuthProvider polls this; a 503 pops paywall modals
  "/ingest(.*)", // PostHog capture proxy (next.config rewrites run after middleware)
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  if (COMING_SOON) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/coming-soon", req.url));
    }
    if (isAllowedInComingSoon(req)) return;
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Temporarily unavailable" },
        { status: 503 },
      );
    }
    return NextResponse.redirect(new URL("/", req.url), 307);
  }

  // Flag off: keep / canonical — the teaser has no reason to be visited directly.
  if (pathname === "/coming-soon") {
    return NextResponse.redirect(new URL("/", req.url), 307);
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and all static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
