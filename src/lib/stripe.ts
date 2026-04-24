import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Returns a singleton server-side Stripe instance.
 * Throws if STRIPE_SECRET_KEY is not set — call this only inside server
 * routes that are gated accordingly.
 */
export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  // Use the library's default (latest) API version.
  _stripe = new Stripe(key);
  return _stripe;
}
