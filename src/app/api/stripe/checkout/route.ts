import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "Checkout not configured" }, { status: 500 });
  }

  // Pull the Clerk email and append it to the Whop checkout URL so the email
  // is pre-filled. This guarantees the Whop membership ends up under the same
  // email that's logged into Polykit, which is what we use to look up access.
  let url = baseUrl;
  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) {
      const u = new URL(baseUrl);
      u.searchParams.set("email", email);
      // Pass Clerk userId so we can correlate webhooks → Polykit user later.
      u.searchParams.set("metadata[clerk_user_id]", userId);
      url = u.toString();
    }
  } catch {
    // fall through to base URL — better to checkout than to fail
  }

  return NextResponse.json({ url });
}
