// OAuth 2.1 authorization endpoint.
//
// This is the page Claude.ai opens when you click Connect. It is a normal
// Clerk-guarded page, so an anonymous visitor gets bounced to /sign-in and
// returns here afterwards — which is the "route to the Clerk thing" behaviour
// a connector flow expects. Once signed in and subscribed, approving mints a
// one-time authorization code and redirects back to the client.
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getClient, issueCode, redirectUriAllowed, OAUTH_SCOPE } from "@/lib/oauth";
import { isUserSubscribed } from "@/lib/subscription";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

/** Errors we cannot safely bounce back to the client are rendered here. */
function Fault({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-[#e3e3e3] bg-white p-7 shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
        <h1 className="font-display text-xl font-semibold text-[#0d0d0d]">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#525252]">{detail}</p>
        <Link
          href="/mcp"
          className="mt-6 inline-flex text-sm font-medium text-[#006fff] hover:underline"
        >
          See the setup guide →
        </Link>
      </div>
    </main>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const clientId = first(sp.client_id);
  const redirectUri = first(sp.redirect_uri);
  const responseType = first(sp.response_type) || "code";
  const codeChallenge = first(sp.code_challenge);
  const codeChallengeMethod = first(sp.code_challenge_method) || "S256";
  const state = first(sp.state);
  const scope = first(sp.scope) || OAUTH_SCOPE;
  const resource = first(sp.resource);

  if (!clientId) {
    return <Fault title="Missing client_id" detail="This authorization request has no client_id." />;
  }

  const client = await getClient(clientId);
  if (!client) {
    return (
      <Fault
        title="Unknown client"
        detail="This client is not registered with Polykit. Try removing and re-adding the connector so it can register again."
      />
    );
  }

  // Never redirect to an unregistered URI — that is how open redirectors happen.
  if (!redirectUri || !redirectUriAllowed(client.redirectUris, redirectUri)) {
    return (
      <Fault
        title="Invalid redirect_uri"
        detail="The redirect URI in this request was not registered by the client, so Polykit will not redirect to it."
      />
    );
  }

  // From here the redirect_uri is trusted, so protocol errors go back to the client.
  const bounce = (error: string, description: string) => {
    const url = new URL(redirectUri);
    url.searchParams.set("error", error);
    url.searchParams.set("error_description", description);
    if (state) url.searchParams.set("state", state);
    redirect(url.toString());
  };

  if (responseType !== "code") {
    bounce("unsupported_response_type", "Only the authorization code flow is supported.");
  }
  if (!codeChallenge) {
    bounce("invalid_request", "PKCE is required: code_challenge is missing.");
  }
  if (codeChallengeMethod !== "S256") {
    bounce("invalid_request", "code_challenge_method must be S256.");
  }

  // Not signed in → send to Clerk, then come straight back to this URL.
  const { userId } = await auth();
  if (!userId) {
    const self = new URL("/oauth/authorize", "https://placeholder.local");
    for (const [k, v] of Object.entries(sp)) {
      const value = first(v);
      if (value) self.searchParams.set(k, value);
    }
    const returnTo = `${self.pathname}${self.search}`;
    redirect(`/sign-in?redirect_url=${encodeURIComponent(returnTo)}`);
  }

  // Signed in but not paying → explain, do not hand out a token.
  if (!(await isUserSubscribed(userId))) {
    return (
      <Fault
        title="Subscription required"
        detail="Your Polykit subscription is not active, so this connector cannot be authorized. Reactivate it and try connecting again."
      />
    );
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const clientLabel = client.clientName?.trim() || "An MCP client";

  async function approve() {
    "use server";
    const { userId: confirmedUserId } = await auth();
    if (!confirmedUserId) redirect("/sign-in");
    if (!(await isUserSubscribed(confirmedUserId))) redirect("/pricing");

    const code = await issueCode({
      clientId,
      userId: confirmedUserId,
      redirectUri,
      codeChallenge,
      scope,
      resource: resource || null,
    });

    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);
    redirect(url.toString());
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-[#e3e3e3] bg-white p-7 shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={36} height={36} className="rounded-xl" />
          <div>
            <p className="font-display text-lg font-semibold tracking-[-0.01em] text-[#0d0d0d]">
              Connect to Polykit
            </p>
            {email ? <p className="text-[13px] text-[#737373]">Signed in as {email}</p> : null}
          </div>
        </div>

        <p className="mt-6 text-[15px] leading-relaxed text-[#0d0d0d]">
          <span className="font-medium">{clientLabel}</span> wants to analyze Polymarket markets
          using your Polykit subscription.
        </p>

        <ul className="mt-5 space-y-2.5 rounded-xl border border-[#e3e3e3] bg-[#f7f7f7] px-4 py-3.5">
          <li className="text-[13px] leading-relaxed text-[#525252]">
            Call <code className="font-mono text-[12px] text-[#0d0d0d]">analyze_market</code> on
            your behalf
          </li>
          <li className="text-[13px] leading-relaxed text-[#525252]">
            Record the call in your usage history
          </li>
          <li className="text-[13px] leading-relaxed text-[#525252]">
            No access to your payment details, and it can never place a trade
          </li>
        </ul>

        <form action={approve} className="mt-6">
          <button type="submit" className="btn-primary btn-primary-md w-full">
            Approve and connect →
          </button>
        </form>

        <p className="mt-3 text-center text-[12px] text-[#a3a3a3]">
          You can revoke this from your dashboard at any time.
        </p>
      </div>
    </main>
  );
}
