import Stripe from "stripe";
import { db } from "@db/db";
import { subscriptions } from "@db/schema";
import { eq } from "drizzle-orm";
import { updatePlanLimits } from "./workspace/billing";

let _instance: Stripe | undefined;

function getInstance(): Stripe {
  if (!_instance) {
    _instance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
    });
  }
  return _instance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_: Stripe, prop: string | symbol) {
    return getInstance()[prop as keyof Stripe];
  },
});

export function getPlanFromPriceId(priceId: string): PlanId {
  if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY)
    return "professional";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS_MONTHLY) return "business";
  return "starter";
}

export async function handleSubscriptionUpsert(
  sub: Stripe.Subscription
): Promise<void> {
  const priceId = sub.items.data[0]?.price.id ?? "";
  const plan = getPlanFromPriceId(priceId);
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const periodEnd = sub.items.data[0].current_period_end
    ? new Date(sub.items.data[0].current_period_end * 1000)
    : null;

  const [existing] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);

  await db
    .update(subscriptions)
    .set({
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      plan,
      status: sub.status as string,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));

  // Update plan limits — for downgrades this is the deferred update;
  // for upgrades it's idempotent (already applied immediately in changePlan)
  if (existing?.userId) {
    await updatePlanLimits(existing.userId, plan);
  }
}

export async function handleSubscriptionDeleted(
  sub: Stripe.Subscription
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const [existing] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);

  await db
    .update(subscriptions)
    .set({
      stripeSubscriptionId: null,
      stripePriceId: null,
      plan: "starter",
      status: "canceled",
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));

  // Reset limits to starter now that the subscription has actually ended
  if (existing?.userId) {
    await updatePlanLimits(existing.userId, "starter");
  }
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer?.id ?? "");

  if (!customerId) return;

  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.stripeCustomerId, customerId));
}

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer?.id ?? "");

  if (!customerId) return;

  const [existing] = await db
    .select({ userId: subscriptions.userId, plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);

  if (existing?.userId) {
    await updatePlanLimits(existing.userId, existing.plan ?? "starter");
  }
}
