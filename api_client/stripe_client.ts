import Stripe from "stripe";

let _instance: Stripe | undefined;

function getInstance(): Stripe {
  if (!_instance) {
    _instance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
    });
  }
  return _instance;
}

// Lazy proxy so the SDK (and its env key) is only touched on first real call.
const stripe = new Proxy({} as Stripe, {
  get(_: Stripe, prop: string | symbol) {
    return getInstance()[prop as keyof Stripe];
  },
});

export interface StripeClientInterface {
  createCustomer(email: string, userId: string): Promise<{ id: string }>;
  createSetupIntent(customerId: string): Promise<{ clientSecret: string }>;
  attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<void>;
  setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<void>;
  createSubscription(
    customerId: string,
    priceId: string,
    defaultPaymentMethodId: string
  ): Promise<void>;
  retrieveCustomerWithDefaultPaymentMethod(
    customerId: string
  ): Promise<Stripe.Customer | Stripe.DeletedCustomer>;
  retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
  updateSubscriptionPrice(
    subscriptionId: string,
    itemId: string,
    priceId: string
  ): Promise<void>;
  setSubscriptionCancelAtPeriodEnd(
    subscriptionId: string,
    cancel: boolean
  ): Promise<void>;
  setSubscriptionDefaultPaymentMethod(
    subscriptionId: string,
    paymentMethodId: string
  ): Promise<void>;
  listInvoices(customerId: string, limit: number): Promise<Stripe.Invoice[]>;
  constructWebhookEvent(
    payload: string,
    signature: string,
    secret: string
  ): Stripe.Event;
}

export class StripeApiClient implements StripeClientInterface {
  constructor(private readonly stripe: Stripe) {}

  async createCustomer(email: string, userId: string): Promise<{ id: string }> {
    const customer = await this.stripe.customers.create({
      email,
      metadata: { userId },
    });
    return { id: customer.id };
  }

  async createSetupIntent(
    customerId: string
  ): Promise<{ clientSecret: string }> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });
    return { clientSecret: setupIntent.client_secret! };
  }

  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<void> {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<void> {
    await this.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    defaultPaymentMethodId: string
  ): Promise<void> {
    await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: defaultPaymentMethodId,
    });
  }

  async retrieveCustomerWithDefaultPaymentMethod(
    customerId: string
  ): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    return this.stripe.customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
  }

  async retrieveSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  async updateSubscriptionPrice(
    subscriptionId: string,
    itemId: string,
    priceId: string
  ): Promise<void> {
    await this.stripe.subscriptions.update(subscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
    });
  }

  async setSubscriptionCancelAtPeriodEnd(
    subscriptionId: string,
    cancel: boolean
  ): Promise<void> {
    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancel,
    });
  }

  async setSubscriptionDefaultPaymentMethod(
    subscriptionId: string,
    paymentMethodId: string
  ): Promise<void> {
    await this.stripe.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId,
    });
  }

  async listInvoices(
    customerId: string,
    limit: number
  ): Promise<Stripe.Invoice[]> {
    const list = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return list.data;
  }

  constructWebhookEvent(
    payload: string,
    signature: string,
    secret: string
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}

export const stripeApiClient = new StripeApiClient(stripe);
