import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

// MCP uses Bearer credentials — never Clerk cookie auth. The OAuth token and
// registration endpoints are machine-to-machine for the same reason: the client
// calls them without a browser session.
const isMcpRoute = createRouteMatcher([
  "/api/mcp",
  "/api/sse",
  "/api/message",
  "/api/oauth/(.*)",
]);

// Teaser gate. Set COMING_SOON=1 to send visitors to /coming-soon instead of
// the marketing site. Unset (or any other value) serves the live product.
const comingSoon = process.env.COMING_SOON === "1";

// Stays reachable while the teaser is up: paying members keep their dashboard
// and connection keys, Whop billing webhooks keep firing, and the links in the
// teaser footer still resolve.
const bypassesTeaser = createRouteMatcher([
  "/coming-soon",
  "/api/(.*)",
  "/dashboard(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Connector authorization must survive the teaser: a member connecting from
  // claude.ai lands here mid-OAuth-redirect.
  "/oauth/(.*)",
  "/contact",
  "/privacy",
  "/terms",
  // Crawler + agent files must always serve their real contents — a redirect
  // here means crawlers lose our directives entirely.
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/llms-full.txt",
  // MCP clients probe these during auth discovery; never send them to the teaser.
  "/.well-known/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  if (comingSoon) {
    if (!bypassesTeaser(req)) {
      return NextResponse.redirect(new URL("/coming-soon", req.url), 307);
    }
  } else if (pathname === "/coming-soon") {
    // Teaser off — send stragglers to the live MCP landing.
    return NextResponse.redirect(new URL("/", req.url), 307);
  }

  if (isMcpRoute(req)) return;

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
