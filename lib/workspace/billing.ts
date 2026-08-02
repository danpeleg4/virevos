import { getCurrentUser } from "@/lib/supabase/auth";
import { ensureUserRow } from "../user";
import type { UserDB } from "@db/classes/user_db";
import type { BillingDB } from "@db/classes/billing_db";
import type { StripeClientInterface } from "@/api_client/stripe_client";
import type Stripe from "stripe";

function getPriceId(planId: string): string | undefined {
  const map: Record<string, string | undefined> = {
    professional: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
    business: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
  };
  return map[planId];
}

export function getPlanFromPriceId(priceId: string): PlanId {
  if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY)
    return "professional";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS_MONTHLY) return "business";
  return "starter";
}

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  billingDb: BillingDB,
  stripeClient: StripeClientInterface
): Promise<string> {
  const existing = await billingDb.getStripeCustomerId(userId);

  if (existing.length > 0) {
    return existing[0].stripeCustomerId;
  }

  const customer = await stripeClient.createCustomer(email, userId);

  await billingDb.insertSubscription({
    userId,
    stripeCustomerId: customer.id,
    plan: "starter",
    status: "active",
  });

  return customer.id;
}

export async function createSetupIntent(
  billingDb: BillingDB,
  stripeClient: StripeClientInterface,
  userDb: UserDB
): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  await ensureUserRow(userDb);

  const email = user.email ?? "";
  const customerId = await getOrCreateStripeCustomer(
    user.id,
    email,
    billingDb,
    stripeClient
  );

  const setupIntent = await stripeClient.createSetupIntent(customerId);

  return setupIntent.clientSecret;
}

export async function createSubscription(
  input: CreateSubscriptionInput,
  billingDb: BillingDB,
  stripeClient: StripeClientInterface,
  userDb: UserDB
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  await ensureUserRow(userDb);

  const email = user.email ?? "";
  const customerId = await getOrCreateStripeCustomer(
    user.id,
    email,
    billingDb,
    stripeClient
  );

  await stripeClient.attachPaymentMethod(input.paymentMethodId, customerId);

  await stripeClient.setDefaultPaymentMethod(customerId, input.paymentMethodId);

  const priceId = getPriceId(input.planId);
  if (!priceId) throw new Error(`Unknown plan: ${input.planId}`);

  await stripeClient.createSubscription(
    customerId,
    priceId,
    input.paymentMethodId
  );
}

export async function registerFreePlan(userDb: UserDB): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  await ensureUserRow(userDb);
}

export async function getBillingOverview(
  billingDb: BillingDB,
  stripeClient: StripeClientInterface
): Promise<BillingOverview> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const subscription = await getUserSubscriptionByUserId(user.id, billingDb);

  const [userRow] = await billingDb.getUserCredits(user.id);

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
    stripeClient.listInvoices(subscription.stripeCustomerId, 10),
    stripeClient.retrieveCustomerWithDefaultPaymentMethod(
      subscription.stripeCustomerId
    ),
  ]);

  const invoices: StripeInvoiceSummary[] = invoiceList.map((inv) => ({
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
  _planId: string,
  billingDb: BillingDB
): Promise<void> {
  await billingDb.resetAiCredits(userId);
}

export async function changePlan(
  input: ChangePlanInput,
  billingDb: BillingDB,
  stripeClient: StripeClientInterface
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const sub = await getUserSubscriptionByUserId(user.id, billingDb);

  // Downgrade to starter: cancel at period end — limits deferred until subscription.deleted fires
  if (input.planId === "starter") {
    if (!sub.stripeSubscriptionId) return; // already on starter free plan
    await stripeClient.setSubscriptionCancelAtPeriodEnd(
      sub.stripeSubscriptionId,
      true
    );
    return;
  }

  if (!sub.stripeCustomerId) throw new Error("No active subscription");

  const priceId = getPriceId(input.planId);
  if (!priceId) throw new Error(`Unknown plan: ${input.planId}`);

  // No existing subscription — create one using the customer's default payment method
  if (!sub.stripeSubscriptionId) {
    const customer =
      await stripeClient.retrieveCustomerWithDefaultPaymentMethod(
        sub.stripeCustomerId
      );
    const deletedCheck = customer as Stripe.DeletedCustomer;
    if (deletedCheck.deleted) throw new Error("Stripe customer deleted");
    const stripeCustomer = customer as Stripe.Customer;
    const pm = stripeCustomer.invoice_settings
      ?.default_payment_method as Stripe.PaymentMethod | null;
    if (!pm?.id)
      throw new Error(
        "No payment method on file. Please add a payment method first."
      );
    await stripeClient.createSubscription(sub.stripeCustomerId, priceId, pm.id);
    await updatePlanLimits(user.id, input.planId, billingDb);
    return;
  }

  const stripeSub = await stripeClient.retrieveSubscription(
    sub.stripeSubscriptionId
  );
  const itemId = stripeSub.items.data[0]?.id;
  if (!itemId) throw new Error("No subscription item found");

  const isUpgrade = (PLAN_RANK[input.planId] ?? 0) > (PLAN_RANK[sub.plan] ?? 0);

  await stripeClient.updateSubscriptionPrice(
    sub.stripeSubscriptionId,
    itemId,
    priceId
  );

  // Only update limits immediately for upgrades; downgrades are deferred to subscription.updated webhook
  if (isUpgrade) {
    await updatePlanLimits(user.id, input.planId, billingDb);
  }
}

export async function cancelSubscription(
  billingDb: BillingDB,
  stripeClient: StripeClientInterface
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const sub = await getUserSubscriptionByUserId(user.id, billingDb);
  if (!sub.stripeSubscriptionId) throw new Error("No active subscription");

  await stripeClient.setSubscriptionCancelAtPeriodEnd(
    sub.stripeSubscriptionId,
    true
  );
}

export async function resubscribe(
  billingDb: BillingDB,
  stripeClient: StripeClientInterface
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const sub = await getUserSubscriptionByUserId(user.id, billingDb);
  if (!sub.stripeSubscriptionId)
    throw new Error("No subscription to reactivate");

  await stripeClient.setSubscriptionCancelAtPeriodEnd(
    sub.stripeSubscriptionId,
    false
  );
}

export async function updatePaymentMethod(
  pmId: string,
  billingDb: BillingDB,
  stripeClient: StripeClientInterface
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const sub = await getUserSubscriptionByUserId(user.id, billingDb);
  if (!sub.stripeCustomerId) throw new Error("No Stripe customer");

  await stripeClient.attachPaymentMethod(pmId, sub.stripeCustomerId);
  await stripeClient.setDefaultPaymentMethod(sub.stripeCustomerId, pmId);

  if (sub.stripeSubscriptionId) {
    await stripeClient.setSubscriptionDefaultPaymentMethod(
      sub.stripeSubscriptionId,
      pmId
    );
  }
}

export async function getUserSubscriptionByUserId(
  userId: string,
  billingDb: BillingDB
): Promise<UserSubscription> {
  const userRows = await billingDb.getUserIdRow(userId);

  if (userRows.length === 0) {
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

  const rows = await billingDb.getSubscriptionByUserId(userId);

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

// ─── Stripe webhook handlers (moved from lib/stripe.ts) ────────────────────

export async function handleSubscriptionUpsert(
  sub: Stripe.Subscription,
  billingDb: BillingDB
): Promise<void> {
  const priceId = sub.items.data[0]?.price.id ?? "";
  const plan = getPlanFromPriceId(priceId);
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const periodEnd = sub.items.data[0].current_period_end
    ? new Date(sub.items.data[0].current_period_end * 1000)
    : null;

  const [existing] =
    await billingDb.getSubscriptionOwnerByCustomerId(customerId);

  await billingDb.updateSubscriptionByCustomerId(customerId, {
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
    plan,
    status: sub.status as string,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    updatedAt: new Date(),
  });

  // Update plan limits — for downgrades this is the deferred update;
  // for upgrades it's idempotent (already applied immediately in changePlan)
  if (existing?.userId) {
    await updatePlanLimits(existing.userId, plan, billingDb);
  }
}

export async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
  billingDb: BillingDB
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const [existing] =
    await billingDb.getSubscriptionOwnerByCustomerId(customerId);

  await billingDb.updateSubscriptionByCustomerId(customerId, {
    stripeSubscriptionId: null,
    stripePriceId: null,
    plan: "starter",
    status: "canceled",
    cancelAtPeriodEnd: false,
    updatedAt: new Date(),
  });

  // Reset limits to starter now that the subscription has actually ended
  if (existing?.userId) {
    await updatePlanLimits(existing.userId, "starter", billingDb);
  }
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  billingDb: BillingDB
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer?.id ?? "");

  if (!customerId) return;

  await billingDb.updateSubscriptionByCustomerId(customerId, {
    status: "past_due",
    updatedAt: new Date(),
  });
}

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  billingDb: BillingDB
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer?.id ?? "");

  if (!customerId) return;

  const [existing] =
    await billingDb.getSubscriptionOwnerByCustomerId(customerId);

  if (existing?.userId) {
    await updatePlanLimits(
      existing.userId,
      existing.plan ?? "starter",
      billingDb
    );
  }
}
