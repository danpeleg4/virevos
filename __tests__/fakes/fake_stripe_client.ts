import type Stripe from "stripe";
import type { StripeClientInterface } from "@/api_client/stripe_client";

export function makeStripeSubscription(
  overrides: Record<string, unknown> = {}
): Stripe.Subscription {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    items: {
      data: [
        {
          id: "si_1",
          price: { id: "price_pro" },
          current_period_end: 1_784_000_000,
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

export function makeStripeCustomer(
  overrides: Record<string, unknown> = {}
): Stripe.Customer {
  return {
    id: "cus_1",
    deleted: undefined,
    invoice_settings: {
      default_payment_method: {
        id: "pm_1",
        card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 },
      },
    },
    ...overrides,
  } as unknown as Stripe.Customer;
}

export type FakeStripeClient = {
  [K in keyof StripeClientInterface]: Mock<StripeClientInterface[K]>;
};

export function makeFakeStripeClient(
  overrides: Partial<StripeClientInterface> = {}
): FakeStripeClient {
  const fake = {
    createCustomer: vi.fn(async () => ({ id: "cus_new" })),
    createSetupIntent: vi.fn(async () => ({ clientSecret: "seti_secret_1" })),
    attachPaymentMethod: vi.fn(async () => {}),
    setDefaultPaymentMethod: vi.fn(async () => {}),
    createSubscription: vi.fn(async () => {}),
    retrieveCustomerWithDefaultPaymentMethod: vi.fn(
      async (): Promise<Stripe.Customer | Stripe.DeletedCustomer> =>
        makeStripeCustomer()
    ),
    retrieveSubscription: vi.fn(async () => makeStripeSubscription()),
    updateSubscriptionPrice: vi.fn(async () => {}),
    setSubscriptionCancelAtPeriodEnd: vi.fn(async () => {}),
    setSubscriptionDefaultPaymentMethod: vi.fn(async () => {}),
    listInvoices: vi.fn(async (): Promise<Stripe.Invoice[]> => []),
    constructWebhookEvent: vi.fn(
      () => ({ type: "noop", data: { object: {} } }) as unknown as Stripe.Event
    ),
  } satisfies StripeClientInterface;

  return Object.assign(fake, overrides) as FakeStripeClient;
}
