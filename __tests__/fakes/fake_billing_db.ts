import type { BillingDB, SubscriptionRow } from "@db/classes/billing_db";

export const canonicalSubscriptionRow: SubscriptionRow = {
  id: 1,
  userId: "user_1",
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: "sub_1",
  stripePriceId: "price_pro",
  plan: "professional",
  status: "active",
  currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
  cancelAtPeriodEnd: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export type FakeBillingDb = {
  [K in keyof BillingDB]: Mock<BillingDB[K]>;
};

export function makeFakeBillingDb(
  overrides: Partial<BillingDB> = {}
): FakeBillingDb {
  const fake = {
    getStripeCustomerId: vi.fn(async (_userId: string) => [
      { stripeCustomerId: "cus_1" },
    ]),
    insertSubscription: vi.fn(async () => {}),
    getUserCredits: vi.fn(async (_userId: string) => [
      { ai_credits: 3, storage: 1024 },
    ]),
    resetAiCredits: vi.fn(async () => {}),
    getUserIdRow: vi.fn(async (userId: string) => [{ id: userId }]),
    getSubscriptionByUserId: vi.fn(async (_userId: string) => [
      { ...canonicalSubscriptionRow },
    ]),
    getSubscriptionOwnerByCustomerId: vi.fn(async (_customerId: string) => [
      { userId: "user_1", plan: "professional" },
    ]),
    updateSubscriptionByCustomerId: vi.fn(async () => {}),
  } satisfies BillingDB;

  return Object.assign(fake, overrides) as FakeBillingDb;
}
