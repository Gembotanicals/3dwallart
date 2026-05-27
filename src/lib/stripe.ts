import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
  typescript: true,
});

// Price IDs from environment variables
export const STRIPE_PRICE_PRO_MONTHLY = process.env.STRIPE_PRICE_PRO_MONTHLY || "";
export const STRIPE_PRICE_PRO_YEARLY = process.env.STRIPE_PRICE_PRO_YEARLY || "";
export const STRIPE_PRICE_TEAM_MONTHLY = process.env.STRIPE_PRICE_TEAM_MONTHLY || "";
export const STRIPE_PRICE_TEAM_YEARLY = process.env.STRIPE_PRICE_TEAM_YEARLY || "";

export type Plan = "FREE" | "PRO" | "TEAM" | "ENTERPRISE";

/**
 * Maps a Stripe subscription to our internal Plan enum.
 * Determines plan based on the subscription's price ID.
 */
export function getPlanFromSubscription(subscription: Stripe.Subscription): Plan {
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return "FREE";
  }

  const priceId = subscription.items.data[0]?.price.id;

  if (
    priceId === STRIPE_PRICE_PRO_MONTHLY ||
    priceId === STRIPE_PRICE_PRO_YEARLY
  ) {
    return "PRO";
  }

  if (
    priceId === STRIPE_PRICE_TEAM_MONTHLY ||
    priceId === STRIPE_PRICE_TEAM_YEARLY
  ) {
    return "TEAM";
  }

  // Fallback: check metadata
  const metaPlan = subscription.metadata?.plan;
  if (metaPlan && ["FREE", "PRO", "TEAM", "ENTERPRISE"].includes(metaPlan)) {
    return metaPlan as Plan;
  }

  return "FREE";
}
