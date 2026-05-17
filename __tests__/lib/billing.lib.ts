import {
  createSetupIntent,
  getUserSubscription,
  changePlan,
  cancelSubscription,
  updatePaymentMethod,
  registerFreePlan,
} from "@/lib/workspace/billing";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/user", () => ({
  ensureUserRow: vi.fn(),
}));

const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockReturning = vi.fn();
const mockOnConflictDoNothing = vi.fn();
const mockValues = vi.fn(() => ({
  returning: mockReturning,
  onConflictDoNothing: mockOnConflictDoNothing,
}));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(() => ({ from: mockFrom })),
    insert: vi.fn(() => ({ values: mockValues })),
    update: vi.fn(() => ({ set: mockSet })),
  },
}));

const mockStripeSetupIntentCreate = vi.fn();
const mockStripeCustomerCreate = vi.fn();
const mockStripeCustomerRetrieve = vi.fn();
const mockStripeCustomerUpdate = vi.fn();
const mockStripePaymentMethodAttach = vi.fn();
const mockStripeSubscriptionCreate = vi.fn();
const mockStripeSubscriptionUpdate = vi.fn();
const mockStripeSubscriptionRetrieve = vi.fn();
const mockStripeInvoiceList = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    setupIntents: {
      create: (...args: unknown[]) => mockStripeSetupIntentCreate(...args),
    },
    customers: {
      create: (...args: unknown[]) => mockStripeCustomerCreate(...args),
      retrieve: (...args: unknown[]) => mockStripeCustomerRetrieve(...args),
      update: (...args: unknown[]) => mockStripeCustomerUpdate(...args),
    },
    paymentMethods: {
      attach: (...args: unknown[]) => mockStripePaymentMethodAttach(...args),
    },
    subscriptions: {
      create: (...args: unknown[]) => mockStripeSubscriptionCreate(...args),
      update: (...args: unknown[]) => mockStripeSubscriptionUpdate(...args),
      retrieve: (...args: unknown[]) => mockStripeSubscriptionRetrieve(...args),
    },
    invoices: { list: (...args: unknown[]) => mockStripeInvoiceList(...args) },
  },
}));

const mockUser = {
  id: "user_1",
  email: "test@example.com",
};

function mockDbSelect(rows: unknown[]) {
  const limitMock = vi.fn().mockResolvedValue(rows);
  const whereMock = vi.fn(() => ({ limit: limitMock }));
  const fromMock = vi.fn(() => ({ where: whereMock }));
  (db.select as Mock).mockReturnValue({
    from: fromMock,
  });
  return { fromMock, whereMock, limitMock };
}

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockWhere.mockResolvedValue(undefined);
  mockLimit.mockResolvedValue([]);
  mockSet.mockReturnValue({ where: mockWhere });
  mockOnConflictDoNothing.mockResolvedValue(undefined);
  mockValues.mockReturnValue({
    returning: mockReturning,
    onConflictDoNothing: mockOnConflictDoNothing,
  });
  mockReturning.mockResolvedValue([]);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── createSetupIntent ────────────────────────────────────────────────────

describe("createSetupIntent", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(createSetupIntent()).rejects.toThrow("Unauthorized");
  });

  it("returns client_secret from Stripe SetupIntent", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockDbSelect([{ stripeCustomerId: "cus_existing" }]);
    mockStripeSetupIntentCreate.mockResolvedValue({
      client_secret: "seti_secret_123",
    });

    const result = await createSetupIntent();
    expect(result).toBe("seti_secret_123");
    expect(mockStripeSetupIntentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" })
    );
  });

  it("creates new Stripe customer if none exists", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockDbSelect([]);
    mockStripeCustomerCreate.mockResolvedValue({ id: "cus_new" });
    mockReturning.mockResolvedValue([]);
    mockStripeSetupIntentCreate.mockResolvedValue({
      client_secret: "seti_secret",
    });

    const result = await createSetupIntent();
    expect(mockStripeCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "test@example.com" })
    );
    expect(result).toBe("seti_secret");
  });
});

// ─── getUserSubscription ──────────────────────────────────────────────────

describe("getUserSubscription", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getUserSubscription()).rejects.toThrow("Unauthorized");
  });

  it("returns starter defaults when no subscription row exists", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockDbSelect([]);

    const result = await getUserSubscription();
    expect(result.plan).toBe("starter");
    expect(result.status).toBe("active");
    expect(result.stripeCustomerId).toBeNull();
  });

  it("returns subscription data from DB when row exists", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockDbSelect([
      {
        plan: "professional",
        status: "active",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_123",
        currentPeriodEnd: new Date("2026-04-01"),
        cancelAtPeriodEnd: false,
      },
    ]);

    const result = await getUserSubscription();
    expect(result.plan).toBe("professional");
    expect(result.stripeCustomerId).toBe("cus_123");
    expect(result.stripeSubscriptionId).toBe("sub_123");
  });
});

// ─── changePlan ───────────────────────────────────────────────────────────

describe("changePlan", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(changePlan({ planId: "professional" })).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when no active subscription", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockDbSelect([]);

    await expect(changePlan({ planId: "professional" })).rejects.toThrow(
      "No active subscription"
    );
  });

  it("sets cancel_at_period_end when downgrading to starter", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockDbSelect([
      {
        plan: "professional",
        status: "active",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_pro",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    ]);
    mockStripeSubscriptionUpdate.mockResolvedValue({});

    await changePlan({ planId: "starter" });
    expect(mockStripeSubscriptionUpdate).toHaveBeenCalledWith(
      "sub_123",
      expect.objectContaining({ cancel_at_period_end: true })
    );
    // Limits must NOT be updated immediately — deferred to subscription.deleted webhook
    expect(mockSet).not.toHaveBeenCalledWith(
      expect.objectContaining({ ai_credits: expect.anything() })
    );
  });

  it("updates limits immediately when upgrading between paid plans", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_biz";
    mockDbSelect([
      {
        plan: "professional",
        status: "active",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_pro",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    ]);
    mockStripeSubscriptionRetrieve.mockResolvedValue({
      items: { data: [{ id: "si_123" }] },
    });
    mockStripeSubscriptionUpdate.mockResolvedValue({});

    await changePlan({ planId: "business" });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ ai_credits: 0 })
    );
  });

  it("does not update limits immediately when downgrading between paid plans", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = "price_pro";
    mockDbSelect([
      {
        plan: "business",
        status: "active",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_biz",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    ]);
    mockStripeSubscriptionRetrieve.mockResolvedValue({
      items: { data: [{ id: "si_123" }] },
    });
    mockStripeSubscriptionUpdate.mockResolvedValue({});

    await changePlan({ planId: "professional" });
    expect(mockSet).not.toHaveBeenCalledWith(
      expect.objectContaining({ ai_credits: expect.anything() })
    );
  });
});

// ─── cancelSubscription ───────────────────────────────────────────────────

describe("cancelSubscription", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(cancelSubscription()).rejects.toThrow("Unauthorized");
  });

  it("calls stripe.subscriptions.update with cancel_at_period_end: true", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockDbSelect([
      {
        plan: "professional",
        status: "active",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_pro",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    ]);
    mockStripeSubscriptionUpdate.mockResolvedValue({});

    await cancelSubscription();
    expect(mockStripeSubscriptionUpdate).toHaveBeenCalledWith(
      "sub_123",
      expect.objectContaining({ cancel_at_period_end: true })
    );
  });
});

// ─── updatePaymentMethod ──────────────────────────────────────────────────

describe("updatePaymentMethod", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updatePaymentMethod("pm_123")).rejects.toThrow("Unauthorized");
  });

  it("throws when no stripe customer", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockDbSelect([]);

    await expect(updatePaymentMethod("pm_123")).rejects.toThrow(
      "No Stripe customer"
    );
  });

  it("attaches PM and updates customer default", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockDbSelect([
      {
        plan: "professional",
        status: "active",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        stripePriceId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    ]);
    mockStripePaymentMethodAttach.mockResolvedValue({});
    mockStripeCustomerUpdate.mockResolvedValue({});
    mockStripeSubscriptionUpdate.mockResolvedValue({});

    await updatePaymentMethod("pm_new");
    expect(mockStripePaymentMethodAttach).toHaveBeenCalledWith("pm_new", {
      customer: "cus_123",
    });
    expect(mockStripeCustomerUpdate).toHaveBeenCalledWith(
      "cus_123",
      expect.objectContaining({
        invoice_settings: { default_payment_method: "pm_new" },
      })
    );
  });
});

// ─── registerFreePlan ─────────────────────────────────────────────────────

describe("registerFreePlan", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(registerFreePlan()).rejects.toThrow("Unauthorized");
  });

  it("does not call Stripe at signup", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await registerFreePlan();
    expect(mockStripeCustomerCreate).not.toHaveBeenCalled();
  });
});
