import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@db/db";
import { subscriptions } from "@db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

function getPlanFromPriceId(priceId: string): PlanId {
  if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY)
    return "professional";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS_MONTHLY) return "business";
  return "starter";
}

async function handleSubscriptionUpsert(
  sub: Stripe.Subscription
): Promise<void> {
  const priceId = sub.items.data[0]?.price.id ?? "";
  const plan = getPlanFromPriceId(priceId);
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const periodEnd = sub.items.data[0].current_period_end
    ? new Date(sub.items.data[0].current_period_end * 1000)
    : null;

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
}

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

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
}

async function handleInvoicePaymentFailed(
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[webhook/stripe] Signature verification failed:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        break;
    }
  } catch (err) {
    console.error("[webhook/stripe] Handler error:", err);
  }

  return new NextResponse(null, { status: 200 });
}
