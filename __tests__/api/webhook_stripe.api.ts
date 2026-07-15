import { POST } from "@/app/api/webhooks/stripe/route";
import { NextRequest } from "next/server";
import {
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  handleSubscriptionDeleted,
  handleSubscriptionUpsert,
} from "@/lib/workspace/billing";
import { billingDrizzle } from "@db/billing_db";

vi.mock("@/lib/workspace/billing", () => ({
  handleInvoicePaymentFailed: vi.fn(),
  handleInvoicePaymentSucceeded: vi.fn(),
  handleSubscriptionDeleted: vi.fn(),
  handleSubscriptionUpsert: vi.fn(),
}));

vi.mock("@db/billing_db", () => ({
  // sentinel — the route must pass this exact instance into the handlers
  billingDrizzle: { __sentinel: "billingDrizzle" },
}));

const mockConstructEvent = vi.fn();
vi.mock("@/api_client/stripe_client", () => ({
  stripeApiClient: {
    constructWebhookEvent: (...args: unknown[]) => mockConstructEvent(...args),
  },
}));

function makeRequest(
  body: string,
  sig: string | null = "valid-sig"
): NextRequest {
  return {
    text: vi.fn().mockResolvedValue(body),
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
  cancel_at_period_end: false,
};

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await POST(makeRequest("{}", null));
    expect(res.status).toBe(400);
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const res = await POST(makeRequest("{}", "bad-sig"));
    expect(res.status).toBe(400);
    expect(handleSubscriptionUpsert).not.toHaveBeenCalled();
  });

  it("verifies the signature against the webhook secret", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.created",
      data: { object: {} },
    });

    await POST(makeRequest("payload-body"));

    expect(mockConstructEvent).toHaveBeenCalledWith(
      "payload-body",
      "valid-sig",
      "whsec_test"
    );
  });

  it("dispatches subscription.created to handleSubscriptionUpsert with the wired db", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: { object: baseSubscription },
    });

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(handleSubscriptionUpsert).toHaveBeenCalledWith(
      baseSubscription,
      billingDrizzle
    );
  });

  it("dispatches subscription.updated to handleSubscriptionUpsert", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: baseSubscription },
    });

    await POST(makeRequest("{}"));

    expect(handleSubscriptionUpsert).toHaveBeenCalledWith(
      baseSubscription,
      billingDrizzle
    );
  });

  it("dispatches subscription.deleted to handleSubscriptionDeleted", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: baseSubscription },
    });

    await POST(makeRequest("{}"));

    expect(handleSubscriptionDeleted).toHaveBeenCalledWith(
      baseSubscription,
      billingDrizzle
    );
  });

  it("dispatches invoice.payment_failed to handleInvoicePaymentFailed", async () => {
    const invoice = { customer: "cus_123" };
    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: { object: invoice },
    });

    await POST(makeRequest("{}"));

    expect(handleInvoicePaymentFailed).toHaveBeenCalledWith(
      invoice,
      billingDrizzle
    );
  });

  it("dispatches invoice.payment_succeeded to handleInvoicePaymentSucceeded", async () => {
    const invoice = { customer: "cus_123" };
    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_succeeded",
      data: { object: invoice },
    });

    await POST(makeRequest("{}"));

    expect(handleInvoicePaymentSucceeded).toHaveBeenCalledWith(
      invoice,
      billingDrizzle
    );
  });

  it("ignores unknown event types and returns 200", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.created",
      data: { object: {} },
    });

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(handleSubscriptionUpsert).not.toHaveBeenCalled();
    expect(handleSubscriptionDeleted).not.toHaveBeenCalled();
  });

  it("still returns 200 when a handler throws (Stripe retries otherwise)", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: { object: baseSubscription },
    });
    (handleSubscriptionUpsert as Mock).mockRejectedValueOnce(
      new Error("db down")
    );

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
  });
});
