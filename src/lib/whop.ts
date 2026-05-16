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
    // Don't filter by status here — Whop's `?status=active` excludes trialing
    // members. We check status/validity in our own code below.
    const url = new URL("https://api.whop.com/api/v2/memberships");
    url.searchParams.set("per", "100");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!res.ok) return false;

    type ApiMembership = {
      plan_id?: string;
      plan?: { id?: string };
      status?: string;
      valid?: boolean;
      user?: { email?: string };
    };
    const data = (await res.json()) as { data?: ApiMembership[] };

    const memberships = data.data ?? [];
    return memberships.some((m) => {
      const emailMatch = m.user?.email?.toLowerCase() === email.toLowerCase();
      // Whop sometimes returns plan as nested object, sometimes flat plan_id.
      const planId = m.plan?.id ?? m.plan_id ?? "";
      const planMatch = planIds.length === 0 || planIds.includes(planId);
      // Accept active OR trialing OR `valid: true`.
      const status = (m.status ?? "").toLowerCase();
      const statusOk = m.valid === true || status === "active" || status === "trialing";
      return emailMatch && planMatch && statusOk;
    });
  } catch {
    return false;
  }
}
