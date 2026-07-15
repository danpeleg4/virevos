import { GET, POST } from "@/app/api/billing/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  cancelSubscription,
  changePlan,
  createSubscription,
  getBillingOverview,
  registerFreePlan,
  resubscribe,
  updatePaymentMethod,
} from "@/lib/workspace/billing";
import { billingDrizzle } from "@db/billing_db";
import { userDrizzle } from "@db/user_db";
import { stripeApiClient } from "@/api_client/stripe_client";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/billing", () => ({
  cancelSubscription: vi.fn(),
  changePlan: vi.fn(),
  createSubscription: vi.fn(),
  getBillingOverview: vi.fn(),
  registerFreePlan: vi.fn(),
  resubscribe: vi.fn(),
  updatePaymentMethod: vi.fn(),
}));

vi.mock("@db/billing_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  billingDrizzle: { __sentinel: "billingDrizzle" },
}));

vi.mock("@db/user_db", () => ({
  userDrizzle: { __sentinel: "userDrizzle" },
}));

vi.mock("@/api_client/stripe_client", () => ({
  // sentinel — the route must pass this exact client into the lib fns
  stripeApiClient: { __sentinel: "stripeApiClient" },
}));

const postRequest = (body: unknown) =>
  new Request("http://localhost/api/billing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/billing", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(getBillingOverview).not.toHaveBeenCalled();
  });

  it("returns 200 with BillingOverview from the wired deps", async () => {
    const overview = {
      subscription: { plan: "professional", status: "active" },
      invoices: [{ id: "inv_1" }],
      paymentMethod: { brand: "visa", last4: "4242" },
      aiCredits: 3,
      storage: 1024,
    };
    (getBillingOverview as Mock).mockResolvedValue(overview);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscription.plan).toBe("professional");
    expect(body.paymentMethod.last4).toBe("4242");
    expect(getBillingOverview).toHaveBeenCalledWith(
      billingDrizzle,
      stripeApiClient
    );
  });

  it("returns 500 when getBillingOverview throws", async () => {
    (getBillingOverview as Mock).mockRejectedValue(new Error("Stripe error"));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/billing", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await POST(postRequest({ type: "cancel" }));
    expect(res.status).toBe(401);
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it("dispatches create-subscription with the wired deps", async () => {
    const data = { planId: "professional", paymentMethodId: "pm_1" };

    const res = await POST(postRequest({ type: "create-subscription", data }));

    expect(res.status).toBe(200);
    expect(createSubscription).toHaveBeenCalledWith(
      data,
      billingDrizzle,
      stripeApiClient,
      userDrizzle
    );
  });

  it("dispatches register-free with the wired user db", async () => {
    const res = await POST(postRequest({ type: "register-free" }));

    expect(res.status).toBe(200);
    expect(registerFreePlan).toHaveBeenCalledWith(userDrizzle);
  });

  it("dispatches change-plan with the wired deps", async () => {
    const res = await POST(
      postRequest({ type: "change-plan", data: { planId: "business" } })
    );

    expect(res.status).toBe(200);
    expect(changePlan).toHaveBeenCalledWith(
      { planId: "business" },
      billingDrizzle,
      stripeApiClient
    );
  });

  it("dispatches cancel and resubscribe", async () => {
    await POST(postRequest({ type: "cancel" }));
    expect(cancelSubscription).toHaveBeenCalledWith(
      billingDrizzle,
      stripeApiClient
    );

    await POST(postRequest({ type: "resubscribe" }));
    expect(resubscribe).toHaveBeenCalledWith(billingDrizzle, stripeApiClient);
  });

  it("dispatches update-payment-method with the payment method id", async () => {
    const res = await POST(
      postRequest({
        type: "update-payment-method",
        data: { paymentMethodId: "pm_2" },
      })
    );

    expect(res.status).toBe(200);
    expect(updatePaymentMethod).toHaveBeenCalledWith(
      "pm_2",
      billingDrizzle,
      stripeApiClient
    );
  });

  it("returns 400 for an unknown type", async () => {
    const res = await POST(postRequest({ type: "bogus" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 with the error message when a lib fn throws", async () => {
    (changePlan as Mock).mockRejectedValueOnce(
      new Error("No payment method on file. Please add a payment method first.")
    );

    const res = await POST(
      postRequest({ type: "change-plan", data: { planId: "business" } })
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "No payment method on file. Please add a payment method first.",
    });
  });
});
