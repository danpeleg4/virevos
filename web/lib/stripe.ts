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

export const stripe = new Proxy({} as Stripe, {
  get(_: Stripe, prop: string | symbol) {
    return getInstance()[prop as keyof Stripe];
  },
});
