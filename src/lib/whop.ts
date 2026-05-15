/**
 * Checks if a user has an active Whop membership by email.
 *
 * Supports multiple plan IDs via comma-separated WHOP_PLAN_ID and/or a
 * separate WHOP_LEGACY_PLAN_ID so existing members on old plans keep access.
 */
export async function checkWhopAccess(email: string): Promise<boolean> {
  const apiKey = process.env.WHOP_API_KEY;
  // Collect all valid plan IDs — current + legacy.
  const planIds = [
    ...(process.env.WHOP_PLAN_ID ?? "").split(","),
    ...(process.env.WHOP_LEGACY_PLAN_ID ?? "").split(","),
  ]
    .map((s) => s.trim())
    .filter(Boolean);

  if (!apiKey || !email) return false;

  try {
    const url = new URL("https://api.whop.com/api/v2/memberships");
    url.searchParams.set("status", "active");
    url.searchParams.set("per", "100");

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
      // If no plan IDs configured, any active membership counts.
      const planMatch = planIds.length === 0 || planIds.includes(m.plan_id ?? "");
      return emailMatch && planMatch;
    });
  } catch {
    return false;
  }
}
