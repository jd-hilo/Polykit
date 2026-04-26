import { currentUser } from "@clerk/nextjs/server";
import { checkWhopAccess } from "./whop";

/**
 * Returns true when the user has an active Whop membership.
 */
export async function isUserSubscribed(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;

  // TEMP: dev mode forced ON in all envs — revert when Whop env is wired up.
  return true;

  // Dev bypass — set DEV_UNLOCK_SUBSCRIPTION=0 to disable
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_UNLOCK_SUBSCRIPTION !== "0"
  ) {
    return true;
  }

  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) return false;
    return await checkWhopAccess(email);
  } catch {
    return false;
  }
}
