type PlanId = "starter" | "professional" | "business";

type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "trialing";

type UserSubscription = {
  plan: PlanId;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

type StripeInvoiceSummary = {
  id: string;
  number: string | null;
  amountPaid: number;
  currency: string;
  status: string | null;
  pdfUrl: string | null | undefined;
  date: number | null;
  description: string | null;
};

type StripePaymentMethodSummary = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

type BillingOverview = {
  subscription: UserSubscription;
  invoices: StripeInvoiceSummary[];
  paymentMethod: StripePaymentMethodSummary | null;
};

type CreateSubscriptionInput = {
  planId: PlanId;
  paymentMethodId: string;
};

type ChangePlanInput = {
  planId: PlanId;
};
