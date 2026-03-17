import {
  createSetupIntent,
  createSubscription,
  getUserSubscription,
  getBillingOverview,
  changePlan,
  cancelSubscription,
  updatePaymentMethod,
  registerFreePlan,
} from "@/lib/billing";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockSet = jest.fn(() => ({ where: mockWhere }));
const mockReturning = jest.fn();
const mockOnConflictDoNothing = jest.fn();
const mockValues = jest.fn(() => ({ returning: mockReturning, onConflictDoNothing: mockOnConflictDoNothing }));
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(() => ({ from: mockFrom })),
    insert: jest.fn(() => ({ values: mockValues })),
    update: jest.fn(() => ({ set: mockSet })),
  },
}));

const mockStripeSetupIntentCreate = jest.fn();
const mockStripeCustomerCreate = jest.fn();
const mockStripeCustomerRetrieve = jest.fn();
const mockStripeCustomerUpdate = jest.fn();
const mockStripePaymentMethodAttach = jest.fn();
const mockStripeSubscriptionCreate = jest.fn();
const mockStripeSubscriptionUpdate = jest.fn();
const mockStripeSubscriptionRetrieve = jest.fn();
const mockStripeInvoiceList = jest.fn();

jest.mock("@/lib/stripe", () => ({
  stripe: {
    setupIntents: { create: (...args: unknown[]) => mockStripeSetupIntentCreate(...args) },
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
  emailAddresses: [{ emailAddress: "test@example.com" }],
};

function mockDbSelect(rows: unknown[]) {
  const limitMock = jest.fn().mockResolvedValue(rows);
  const whereMock = jest.fn(() => ({ limit: limitMock }));
  const fromMock = jest.fn(() => ({ where: whereMock }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require("@db/db").db.select as jest.Mock).mockReturnValue({
    from: fromMock,
  });
  return { fromMock, whereMock, limitMock };
}

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  mockWhere.mockResolvedValue(undefined);
  mockLimit.mockResolvedValue([]);
  mockSet.mockReturnValue({ where: mockWhere });
  mockOnConflictDoNothing.mockResolvedValue(undefined);
  mockValues.mockReturnValue({ returning: mockReturning, onConflictDoNothing: mockOnConflictDoNothing });
  mockReturning.mockResolvedValue([]);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── createSetupIntent ────────────────────────────────────────────────────

describe("createSetupIntent", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(createSetupIntent()).rejects.toThrow("Unauthorized");
  });

  it("returns client_secret from Stripe SetupIntent", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
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
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockDbSelect([]);
    mockStripeCustomerCreate.mockResolvedValue({ id: "cus_new" });
    mockReturning.mockResolvedValue([]);
    mockStripeSetupIntentCreate.mockResolvedValue({ client_secret: "seti_secret" });

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
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(getUserSubscription()).rejects.toThrow("Unauthorized");
  });

  it("returns starter defaults when no subscription row exists", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockDbSelect([]);

    const result = await getUserSubscription();
    expect(result.plan).toBe("starter");
    expect(result.status).toBe("active");
    expect(result.stripeCustomerId).toBeNull();
  });

  it("returns subscription data from DB when row exists", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
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
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(changePlan({ planId: "professional" })).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when no active subscription", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockDbSelect([]);

    await expect(changePlan({ planId: "professional" })).rejects.toThrow(
      "No active subscription"
    );
  });

  it("sets cancel_at_period_end when downgrading to starter", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
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
  });
});

// ─── cancelSubscription ───────────────────────────────────────────────────

describe("cancelSubscription", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(cancelSubscription()).rejects.toThrow("Unauthorized");
  });

  it("calls stripe.subscriptions.update with cancel_at_period_end: true", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
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
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(updatePaymentMethod("pm_123")).rejects.toThrow("Unauthorized");
  });

  it("throws when no stripe customer", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockDbSelect([]);

    await expect(updatePaymentMethod("pm_123")).rejects.toThrow(
      "No Stripe customer"
    );
  });

  it("attaches PM and updates customer default", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
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
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(registerFreePlan()).rejects.toThrow("Unauthorized");
  });

  it("returns existing customer id without creating new one", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockDbSelect([{ stripeCustomerId: "cus_existing" }]);

    await registerFreePlan();
    expect(mockStripeCustomerCreate).not.toHaveBeenCalled();
  });
});
