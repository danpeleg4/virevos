import { POST } from "@/app/api/webhooks/stripe/route";
import { NextRequest } from "next/server";

const mockDbWhere = jest.fn().mockResolvedValue(undefined);
const mockDbSet = jest.fn(() => ({ where: mockDbWhere }));

jest.mock("@db/db", () => ({
  db: {
    update: jest.fn(() => ({ set: mockDbSet })),
  },
}));

const mockConstructEvent = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();

jest.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) },
    subscriptions: { retrieve: (...args: unknown[]) => mockSubscriptionsRetrieve(...args) },
  },
}));

function makeRequest(body: string, sig: string | null = "valid-sig"): NextRequest {
  return {
    text: jest.fn().mockResolvedValue(body),
    headers: {
      get: (key: string) => {
        if (key === "stripe-signature") return sig;
        return null;
      },
    },
  } as unknown as NextRequest;
}

const baseSubscription = {
  id: "sub_123",
  customer: "cus_123",
  status: "active",
  items: { data: [{ price: { id: "price_pro" } }] },
  current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
  cancel_at_period_end: false,
};

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = "price_pro";
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_biz";
  mockDbSet.mockReturnValue({ where: mockDbWhere });
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await POST(makeRequest("{}", null));
    expect(res.status).toBe(400);
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const res = await POST(makeRequest("{}", "bad-sig"));
    expect(res.status).toBe(400);
  });

  it("handles customer.subscription.created and updates DB", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: { object: baseSubscription },
    });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(mockDbSet).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "professional",
        status: "active",
        stripeSubscriptionId: "sub_123",
      })
    );
  });

  it("handles customer.subscription.updated and updates DB", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: { ...baseSubscription, status: "past_due" } },
    });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(mockDbSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "past_due" })
    );
  });

  it("handles customer.subscription.deleted and resets plan to starter", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: baseSubscription },
    });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(mockDbSet).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "starter",
        status: "canceled",
        stripeSubscriptionId: null,
      })
    );
  });

  it("handles invoice.payment_failed and sets status to past_due", async () => {
    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: { object: { customer: "cus_123" } },
    });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(mockDbSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "past_due" })
    );
  });

  it("ignores unknown event types and returns 200", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.created",
      data: { object: {} },
    });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(mockDbSet).not.toHaveBeenCalled();
  });

  it("derives business plan from business price ID", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: {
        object: {
          ...baseSubscription,
          items: { data: [{ price: { id: "price_biz" } }] },
        },
      },
    });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(mockDbSet).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "business" })
    );
  });
});
