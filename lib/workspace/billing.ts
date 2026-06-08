"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import { ensureUserRow } from "../user";
import { db } from "@db/db";
import { subscriptions, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "../stripe";
import type Stripe from "stripe";

function getPriceId(planId: string): string | undefined {
  const map: Record<string, string | undefined> = {
    professional: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
    business: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
  };
  return map[planId];
}

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const existing = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await db.insert(subscriptions).values({
    userId,
    stripeCustomerId: customer.id,
    plan: "starter",
    status: "active",
  });

  return customer.id;
}

export async function createSetupIntent(): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  await ensureUserRow();

  const email = user.email ?? "";
  const customerId = await getOrCreateStripeCustomer(user.id, email);

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });

  return setupIntent.client_secret!;
}

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  await ensureUserRow();

  const email = user.email ?? "";
  const customerId = await getOrCreateStripeCustomer(user.id, email);

  await stripe.paymentMethods.attach(input.paymentMethodId, {
    customer: customerId,
  });

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: input.paymentMethodId },
  });

  const priceId = getPriceId(input.planId);
  if (!priceId) throw new Error(`Unknown plan: ${input.planId}`);

  await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: input.paymentMethodId,
  });
}

export async function registerFreePlan(): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  await ensureUserRow();
}

export async function getBillingOverview(): Promise<BillingOverview> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const subscription = await getUserSubscriptionByUserId(user.id);

  const [userRow] = await db
    .select({ ai_credits: users.aiCredits, storage: users.storage })
    .from(users)
    .where(eq(users.userId, user.id))
    .limit(1);

  const aiCredits = userRow?.ai_credits ?? 0;
  const storage = userRow?.storage ?? 1;

  if (!subscription.stripeCustomerId) {
    return {
      subscription,
      invoices: [],
      paymentMethod: null,
      aiCredits,
      storage,
    };
  }

  const [invoiceList, customer] = await Promise.all([
    stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 10,
    }),
    stripe.customers.retrieve(subscription.stripeCustomerId, {
      expand: ["invoice_settings.default_payment_method"],
    }),
  ]);

  const invoices: StripeInvoiceSummary[] = invoiceList.data.map((inv) => ({
    id: inv.id,
    number: inv.number,
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    status: inv.status,
    pdfUrl: inv.invoice_pdf,
    date: inv.created,
    description: inv.description,
  }));

  let paymentMethod: StripePaymentMethodSummary | null = null;
  const deletedCustomer = customer as Stripe.DeletedCustomer;
  if (!deletedCustomer.deleted) {
    const stripeCustomer = customer as Stripe.Customer;
    const pm = stripeCustomer.invoice_settings
      ?.default_payment_method as Stripe.PaymentMethod | null;
    if (pm?.card) {
      paymentMethod = {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      };
    }
  }

  return { subscription, invoices, paymentMethod, aiCredits, storage };
}

const PLAN_RANK: Record<string, number> = {
  starter: 0,
  professional: 1,
  business: 2,
};

export async function updatePlanLimits(
  userId: string,
  _planId: string
): Promise<void> {
  await db.update(users).set({ aiCredits: 0 }).where(eq(users.userId, userId));
}

export async function changePlan(input: ChangePlanInput): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const sub = await getUserSubscriptionByUserId(user.id);

  // Downgrade to starter: cancel at period end — limits deferred until subscription.deleted fires
  if (input.planId === "starter") {
    if (!sub.stripeSubscriptionId) return; // already on starter free plan
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    return;
  }

  if (!sub.stripeCustomerId) throw new Error("No active subscription");

  const priceId = getPriceId(input.planId);
  if (!priceId) throw new Error(`Unknown plan: ${input.planId}`);

  // No existing subscription — create one using the customer's default payment method
  if (!sub.stripeSubscriptionId) {
    const customer = await stripe.customers.retrieve(sub.stripeCustomerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    const deletedCheck = customer as import("stripe").default.DeletedCustomer;
    if (deletedCheck.deleted) throw new Error("Stripe customer deleted");
    const stripeCustomer = customer as import("stripe").default.Customer;
    const pm = stripeCustomer.invoice_settings?.default_payment_method as
      | import("stripe").default.PaymentMethod
      | null;
    if (!pm?.id)
      throw new Error(
        "No payment method on file. Please add a payment method first."
      );
    await stripe.subscriptions.create({
      customer: sub.stripeCustomerId,
      items: [{ price: priceId }],
      default_payment_method: pm.id,
    });
    await updatePlanLimits(user.id, input.planId);
    return;
  }

  const stripeSub = await stripe.subscriptions.retrieve(
    sub.stripeSubscriptionId
  );
  const itemId = stripeSub.items.data[0]?.id;
  if (!itemId) throw new Error("No subscription item found");

  const isUpgrade = (PLAN_RANK[input.planId] ?? 0) > (PLAN_RANK[sub.plan] ?? 0);

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: "create_prorations",
  });

  // Only update limits immediately for upgrades; downgrades are deferred to subscription.updated webhook
  if (isUpgrade) {
    await updatePlanLimits(user.id, input.planId);
  }
}

export async function cancelSubscription(): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const sub = await getUserSubscriptionByUserId(user.id);
  if (!sub.stripeSubscriptionId) throw new Error("No active subscription");

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function resubscribe(): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const sub = await getUserSubscriptionByUserId(user.id);
  if (!sub.stripeSubscriptionId)
    throw new Error("No subscription to reactivate");

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });
}

export async function updatePaymentMethod(pmId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const sub = await getUserSubscriptionByUserId(user.id);
  if (!sub.stripeCustomerId) throw new Error("No Stripe customer");

  await stripe.paymentMethods.attach(pmId, { customer: sub.stripeCustomerId });
  await stripe.customers.update(sub.stripeCustomerId, {
    invoice_settings: { default_payment_method: pmId },
  });

  if (sub.stripeSubscriptionId) {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      default_payment_method: pmId,
    });
  }
}

export async function getUserSubscriptionByUserId(
  userId: string
): Promise<UserSubscription> {
  const [userRow] = await db
    .select({ id: users.userId })
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);

  if (!userRow) {
    return {
      plan: "starter",
      status: "active",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    return {
      plan: "starter",
      status: "active",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const row = rows[0];
  return {
    plan: row.plan as PlanId,
    status: row.status as SubscriptionStatus,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId ?? null,
    stripePriceId: row.stripePriceId ?? null,
    currentPeriodEnd: row.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  };
}
