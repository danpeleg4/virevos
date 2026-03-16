"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { subscriptions, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "./stripe";
import type Stripe from "stripe";

const PRICE_ID_MAP: Record<string, string> = {
  professional: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY!,
  business: process.env.STRIPE_PRICE_BUSINESS_MONTHLY!,
};

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  // Ensure the user row exists before inserting a subscription that FK-references it.
  // The Clerk webhook may not have fired yet during onboarding.
  await db
    .insert(users)
    .values({ user_id: userId, email })
    .onConflictDoNothing();

  const existing = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].stripeCustomerId;
  }

  const customer = await stripe.customers.create({ email, metadata: { userId } });

  await db.insert(subscriptions).values({
    userId,
    stripeCustomerId: customer.id,
    plan: "starter",
    status: "active",
  });

  return customer.id;
}

export async function createSetupIntent(): Promise<string> {
  const user = await currentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const email = user.emailAddresses[0]?.emailAddress ?? "";
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
  const user = await currentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const email = user.emailAddresses[0]?.emailAddress ?? "";
  const customerId = await getOrCreateStripeCustomer(user.id, email);

  await stripe.paymentMethods.attach(input.paymentMethodId, {
    customer: customerId,
  });

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: input.paymentMethodId },
  });

  const priceId = PRICE_ID_MAP[input.planId];
  if (!priceId) throw new Error(`Unknown plan: ${input.planId}`);

  await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: input.paymentMethodId,
  });
}

export async function registerFreePlan(): Promise<void> {
  const user = await currentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const email = user.emailAddresses[0]?.emailAddress ?? "";
  await getOrCreateStripeCustomer(user.id, email);
}

export async function getUserSubscription(): Promise<UserSubscription> {
  const user = await currentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
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

export async function getBillingOverview(): Promise<BillingOverview> {
  const user = await currentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const subscription = await getUserSubscription();

  if (!subscription.stripeCustomerId) {
    return { subscription, invoices: [], paymentMethod: null };
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

  return { subscription, invoices, paymentMethod };
}

export async function changePlan(input: ChangePlanInput): Promise<void> {
  const user = await currentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const sub = await getUserSubscription();
  if (!sub.stripeSubscriptionId) throw new Error("No active subscription");

  if (input.planId === "starter") {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    return;
  }

  const priceId = PRICE_ID_MAP[input.planId];
  if (!priceId) throw new Error(`Unknown plan: ${input.planId}`);

  const stripeSub = await stripe.subscriptions.retrieve(
    sub.stripeSubscriptionId
  );
  const itemId = stripeSub.items.data[0]?.id;
  if (!itemId) throw new Error("No subscription item found");

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: "create_prorations",
  });
}

export async function cancelSubscription(): Promise<void> {
  const user = await currentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const sub = await getUserSubscription();
  if (!sub.stripeSubscriptionId) throw new Error("No active subscription");

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function updatePaymentMethod(pmId: string): Promise<void> {
  const user = await currentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const sub = await getUserSubscription();
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
    .select({ id: users.user_id })
    .from(users)
    .where(eq(users.user_id, userId))
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
