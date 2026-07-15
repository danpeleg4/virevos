import {
  createSetupIntent,
  createSubscription,
  changePlan,
  cancelSubscription,
  resubscribe,
  updatePaymentMethod,
  registerFreePlan,
  getBillingOverview,
  getUserSubscriptionByUserId,
  getOrCreateStripeCustomer,
  handleSubscriptionUpsert,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
} from "@/lib/workspace/billing";
import { getCurrentUser } from "@/lib/supabase/auth";
import { ensureUserRow } from "@/lib/user";
import { makeFakeBillingDb } from "../fakes/fake_billing_db";
import {
  makeFakeStripeClient,
  makeStripeCustomer,
  makeStripeSubscription,
} from "../fakes/fake_stripe_client";
import { makeFakeUserDb } from "../fakes/fake_user_db";
import type Stripe from "stripe";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/user", () => ({
  ensureUserRow: vi.fn(),
}));

const billingDb = makeFakeBillingDb();
const stripeClient = makeFakeStripeClient();
const userDb = makeFakeUserDb();

const mockUser = {
  id: "user_1",
  email: "test@example.com",
};

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue(mockUser);
  process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = "price_pro";
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_biz";
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── getOrCreateStripeCustomer ────────────────────────────────────────────

describe("getOrCreateStripeCustomer", () => {
  it("returns the existing customer id without creating a new one", async () => {
    const id = await getOrCreateStripeCustomer(
      "user_1",
      "test@example.com",
      billingDb,
      stripeClient
    );

    expect(id).toBe("cus_1");
    expect(stripeClient.createCustomer).not.toHaveBeenCalled();
  });

  it("creates a Stripe customer and starter subscription row when none exists", async () => {
    billingDb.getStripeCustomerId.mockResolvedValueOnce([]);

    const id = await getOrCreateStripeCustomer(
      "user_1",
      "test@example.com",
      billingDb,
      stripeClient
    );

    expect(id).toBe("cus_new");
    expect(stripeClient.createCustomer).toHaveBeenCalledWith(
      "test@example.com",
      "user_1"
    );
    expect(billingDb.insertSubscription).toHaveBeenCalledWith({
      userId: "user_1",
      stripeCustomerId: "cus_new",
      plan: "starter",
      status: "active",
    });
  });
});

// ─── createSetupIntent ────────────────────────────────────────────────────

describe("createSetupIntent", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      createSetupIntent(billingDb, stripeClient, userDb)
    ).rejects.toThrow("Unauthorized");
    expect(stripeClient.createSetupIntent).not.toHaveBeenCalled();
  });

  it("ensures the user row and returns the client secret", async () => {
    const secret = await createSetupIntent(billingDb, stripeClient, userDb);

    expect(ensureUserRow).toHaveBeenCalledWith(userDb);
    expect(stripeClient.createSetupIntent).toHaveBeenCalledWith("cus_1");
    expect(secret).toBe("seti_secret_1");
  });
});

// ─── createSubscription ───────────────────────────────────────────────────

describe("createSubscription", () => {
  const input = { planId: "professional", paymentMethodId: "pm_1" } as const;

  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      createSubscription(input, billingDb, stripeClient, userDb)
    ).rejects.toThrow("Unauthorized");
  });

  it("attaches the payment method and creates the subscription", async () => {
    await createSubscription(input, billingDb, stripeClient, userDb);

    expect(stripeClient.attachPaymentMethod).toHaveBeenCalledWith(
      "pm_1",
      "cus_1"
    );
    expect(stripeClient.setDefaultPaymentMethod).toHaveBeenCalledWith(
      "cus_1",
      "pm_1"
    );
    expect(stripeClient.createSubscription).toHaveBeenCalledWith(
      "cus_1",
      "price_pro",
      "pm_1"
    );
  });

  it("rejects an unknown plan before creating anything", async () => {
    await expect(
      createSubscription(
        {
          planId: "enterprise" as CreateSubscriptionInput["planId"],
          paymentMethodId: "pm_1",
        },
        billingDb,
        stripeClient,
        userDb
      )
    ).rejects.toThrow("Unknown plan: enterprise");
    expect(stripeClient.createSubscription).not.toHaveBeenCalled();
  });
});

// ─── registerFreePlan ─────────────────────────────────────────────────────

describe("registerFreePlan", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(registerFreePlan(userDb)).rejects.toThrow("Unauthorized");
  });

  it("ensures the user row exists", async () => {
    await registerFreePlan(userDb);
    expect(ensureUserRow).toHaveBeenCalledWith(userDb);
  });
});

// ─── getUserSubscriptionByUserId ──────────────────────────────────────────

describe("getUserSubscriptionByUserId", () => {
  it("returns the starter default when the user row is missing", async () => {
    billingDb.getUserIdRow.mockResolvedValueOnce([]);

    const sub = await getUserSubscriptionByUserId("ghost", billingDb);

    expect(sub.plan).toBe("starter");
    expect(sub.stripeCustomerId).toBeNull();
    expect(billingDb.getSubscriptionByUserId).not.toHaveBeenCalled();
  });

  it("returns the starter default when no subscription row exists", async () => {
    billingDb.getSubscriptionByUserId.mockResolvedValueOnce([]);

    const sub = await getUserSubscriptionByUserId("user_1", billingDb);

    expect(sub.plan).toBe("starter");
    expect(sub.stripeSubscriptionId).toBeNull();
  });

  it("maps the stored subscription row", async () => {
    const sub = await getUserSubscriptionByUserId("user_1", billingDb);

    expect(sub).toEqual(
      expect.objectContaining({
        plan: "professional",
        status: "active",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
        cancelAtPeriodEnd: false,
      })
    );
  });
});

// ─── getBillingOverview ───────────────────────────────────────────────────

describe("getBillingOverview", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getBillingOverview(billingDb, stripeClient)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("skips Stripe entirely when there is no customer", async () => {
    billingDb.getUserIdRow.mockResolvedValueOnce([]);

    const overview = await getBillingOverview(billingDb, stripeClient);

    expect(overview.invoices).toEqual([]);
    expect(overview.paymentMethod).toBeNull();
    expect(overview.aiCredits).toBe(3);
    expect(stripeClient.listInvoices).not.toHaveBeenCalled();
  });

  it("returns invoices and the default payment method", async () => {
    stripeClient.listInvoices.mockResolvedValueOnce([
      {
        id: "in_1",
        number: "0001",
        amount_paid: 2900,
        currency: "usd",
        status: "paid",
        invoice_pdf: "https://stripe/inv.pdf",
        created: 1_753_000_000,
        description: null,
      } as unknown as Stripe.Invoice,
    ]);

    const overview = await getBillingOverview(billingDb, stripeClient);

    expect(overview.invoices).toEqual([
      expect.objectContaining({ id: "in_1", amountPaid: 2900 }),
    ]);
    expect(overview.paymentMethod).toEqual({
      brand: "visa",
      last4: "4242",
      expMonth: 12,
      expYear: 2030,
    });
  });

  it("returns a null payment method for a deleted customer", async () => {
    stripeClient.retrieveCustomerWithDefaultPaymentMethod.mockResolvedValueOnce(
      { id: "cus_1", deleted: true } as unknown as Stripe.DeletedCustomer
    );

    const overview = await getBillingOverview(billingDb, stripeClient);

    expect(overview.paymentMethod).toBeNull();
  });
});

// ─── changePlan ───────────────────────────────────────────────────────────

describe("changePlan", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      changePlan({ planId: "business" }, billingDb, stripeClient)
    ).rejects.toThrow("Unauthorized");
  });

  it("cancels at period end when downgrading to starter", async () => {
    await changePlan({ planId: "starter" }, billingDb, stripeClient);

    expect(stripeClient.setSubscriptionCancelAtPeriodEnd).toHaveBeenCalledWith(
      "sub_1",
      true
    );
    expect(billingDb.resetAiCredits).not.toHaveBeenCalled();
  });

  it("does nothing when downgrading to starter without a subscription", async () => {
    billingDb.getSubscriptionByUserId.mockResolvedValueOnce([]);

    await changePlan({ planId: "starter" }, billingDb, stripeClient);

    expect(
      stripeClient.setSubscriptionCancelAtPeriodEnd
    ).not.toHaveBeenCalled();
  });

  it("creates a subscription from the default payment method when none exists", async () => {
    const [row] = await billingDb.getSubscriptionByUserId("user_1");
    billingDb.getSubscriptionByUserId.mockResolvedValueOnce([
      { ...row, stripeSubscriptionId: null, plan: "starter" },
    ]);

    await changePlan({ planId: "business" }, billingDb, stripeClient);

    expect(stripeClient.createSubscription).toHaveBeenCalledWith(
      "cus_1",
      "price_biz",
      "pm_1"
    );
    // upgrade applies limits immediately
    expect(billingDb.resetAiCredits).toHaveBeenCalledWith("user_1");
  });

  it("throws when creating a subscription without a payment method on file", async () => {
    const [row] = await billingDb.getSubscriptionByUserId("user_1");
    billingDb.getSubscriptionByUserId.mockResolvedValueOnce([
      { ...row, stripeSubscriptionId: null },
    ]);
    stripeClient.retrieveCustomerWithDefaultPaymentMethod.mockResolvedValueOnce(
      makeStripeCustomer({ invoice_settings: { default_payment_method: null } })
    );

    await expect(
      changePlan({ planId: "business" }, billingDb, stripeClient)
    ).rejects.toThrow("No payment method on file");
  });

  it("swaps the price and applies limits immediately on upgrade", async () => {
    await changePlan({ planId: "business" }, billingDb, stripeClient);

    expect(stripeClient.updateSubscriptionPrice).toHaveBeenCalledWith(
      "sub_1",
      "si_1",
      "price_biz"
    );
    expect(billingDb.resetAiCredits).toHaveBeenCalledWith("user_1");
  });

  it("defers limit updates on a paid-plan downgrade", async () => {
    const [row] = await billingDb.getSubscriptionByUserId("user_1");
    billingDb.getSubscriptionByUserId.mockResolvedValueOnce([
      { ...row, plan: "business" },
    ]);

    await changePlan({ planId: "professional" }, billingDb, stripeClient);

    expect(stripeClient.updateSubscriptionPrice).toHaveBeenCalledWith(
      "sub_1",
      "si_1",
      "price_pro"
    );
    expect(billingDb.resetAiCredits).not.toHaveBeenCalled();
  });
});

// ─── cancel / resubscribe / update payment method ─────────────────────────

describe("cancelSubscription", () => {
  it("throws without an active subscription", async () => {
    billingDb.getSubscriptionByUserId.mockResolvedValueOnce([]);
    await expect(cancelSubscription(billingDb, stripeClient)).rejects.toThrow(
      "No active subscription"
    );
  });

  it("cancels at period end", async () => {
    await cancelSubscription(billingDb, stripeClient);
    expect(stripeClient.setSubscriptionCancelAtPeriodEnd).toHaveBeenCalledWith(
      "sub_1",
      true
    );
  });
});

describe("resubscribe", () => {
  it("throws without a subscription to reactivate", async () => {
    billingDb.getSubscriptionByUserId.mockResolvedValueOnce([]);
    await expect(resubscribe(billingDb, stripeClient)).rejects.toThrow(
      "No subscription to reactivate"
    );
  });

  it("clears cancel-at-period-end", async () => {
    await resubscribe(billingDb, stripeClient);
    expect(stripeClient.setSubscriptionCancelAtPeriodEnd).toHaveBeenCalledWith(
      "sub_1",
      false
    );
  });
});

describe("updatePaymentMethod", () => {
  it("throws without a Stripe customer", async () => {
    billingDb.getSubscriptionByUserId.mockResolvedValueOnce([]);
    await expect(
      updatePaymentMethod("pm_2", billingDb, stripeClient)
    ).rejects.toThrow("No Stripe customer");
  });

  it("attaches, sets default, and updates the subscription", async () => {
    await updatePaymentMethod("pm_2", billingDb, stripeClient);

    expect(stripeClient.attachPaymentMethod).toHaveBeenCalledWith(
      "pm_2",
      "cus_1"
    );
    expect(stripeClient.setDefaultPaymentMethod).toHaveBeenCalledWith(
      "cus_1",
      "pm_2"
    );
    expect(
      stripeClient.setSubscriptionDefaultPaymentMethod
    ).toHaveBeenCalledWith("sub_1", "pm_2");
  });
});

// ─── webhook handlers ─────────────────────────────────────────────────────

describe("handleSubscriptionUpsert", () => {
  it("updates the subscription row and applies plan limits", async () => {
    await handleSubscriptionUpsert(makeStripeSubscription(), billingDb);

    expect(billingDb.updateSubscriptionByCustomerId).toHaveBeenCalledWith(
      "cus_1",
      expect.objectContaining({
        stripeSubscriptionId: "sub_1",
        stripePriceId: "price_pro",
        plan: "professional",
        status: "active",
        cancelAtPeriodEnd: false,
      })
    );
    expect(billingDb.resetAiCredits).toHaveBeenCalledWith("user_1");
  });

  it("skips plan limit updates when no owner row exists", async () => {
    billingDb.getSubscriptionOwnerByCustomerId.mockResolvedValueOnce([]);

    await handleSubscriptionUpsert(makeStripeSubscription(), billingDb);

    expect(billingDb.resetAiCredits).not.toHaveBeenCalled();
  });
});

describe("handleSubscriptionDeleted", () => {
  it("resets the row to starter and applies limits", async () => {
    await handleSubscriptionDeleted(makeStripeSubscription(), billingDb);

    expect(billingDb.updateSubscriptionByCustomerId).toHaveBeenCalledWith(
      "cus_1",
      expect.objectContaining({
        stripeSubscriptionId: null,
        plan: "starter",
        status: "canceled",
      })
    );
    expect(billingDb.resetAiCredits).toHaveBeenCalledWith("user_1");
  });
});

describe("handleInvoicePaymentFailed", () => {
  it("marks the subscription past_due", async () => {
    await handleInvoicePaymentFailed(
      { customer: "cus_1" } as unknown as Stripe.Invoice,
      billingDb
    );

    expect(billingDb.updateSubscriptionByCustomerId).toHaveBeenCalledWith(
      "cus_1",
      expect.objectContaining({ status: "past_due" })
    );
  });

  it("ignores invoices without a customer", async () => {
    await handleInvoicePaymentFailed(
      { customer: null } as unknown as Stripe.Invoice,
      billingDb
    );

    expect(billingDb.updateSubscriptionByCustomerId).not.toHaveBeenCalled();
  });
});

describe("handleInvoicePaymentSucceeded", () => {
  it("applies plan limits for the owning user", async () => {
    await handleInvoicePaymentSucceeded(
      { customer: "cus_1" } as unknown as Stripe.Invoice,
      billingDb
    );

    expect(billingDb.resetAiCredits).toHaveBeenCalledWith("user_1");
  });

  it("does nothing when the customer is unknown", async () => {
    billingDb.getSubscriptionOwnerByCustomerId.mockResolvedValueOnce([]);

    await handleInvoicePaymentSucceeded(
      { customer: "cus_ghost" } as unknown as Stripe.Invoice,
      billingDb
    );

    expect(billingDb.resetAiCredits).not.toHaveBeenCalled();
  });
});
