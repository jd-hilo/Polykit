/**
 * Checks if a user has an active Whop membership by email.
 */
export async function checkWhopAccess(email: string): Promise<boolean> {
  const apiKey = process.env.WHOP_API_KEY;
  const planId = process.env.WHOP_PLAN_ID;
  if (!apiKey || !email) return false;

  try {
    const url = new URL("https://api.whop.com/api/v2/memberships");
    url.searchParams.set("status", "active");
    url.searchParams.set("per", "10");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!res.ok) return false;

    const data = (await res.json()) as {
      data?: { plan_id?: string; user?: { email?: string } }[];
    };

    const memberships = data.data ?? [];
    return memberships.some((m) => {
      const emailMatch = m.user?.email?.toLowerCase() === email.toLowerCase();
      const planMatch = !planId || m.plan_id === planId;
      return emailMatch && planMatch;
    });
  } catch {
    return false;
  }
}
