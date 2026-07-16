import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

// MCP uses Bearer API keys — never Clerk cookie auth.
const isMcpRoute = createRouteMatcher([
  "/api/mcp",
  "/api/sse",
  "/api/message",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Legacy teaser — send to the live MCP landing.
  if (pathname === "/coming-soon") {
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
