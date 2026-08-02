import { GET } from "@/app/api/billing/setup-intent/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createSetupIntent } from "@/lib/workspace/billing";
import { billingDrizzle } from "@db/classes/billing_db";
import { userDrizzle } from "@db/classes/user_db";
import { stripeApiClient } from "@/api_client/stripe_client";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/billing", () => ({
  createSetupIntent: vi.fn(),
}));

vi.mock("@db/classes/billing_db", () => ({
  billingDrizzle: { __sentinel: "billingDrizzle" },
}));

vi.mock("@db/classes/user_db", () => ({
  userDrizzle: { __sentinel: "userDrizzle" },
}));

vi.mock("@/api_client/stripe_client", () => ({
  stripeApiClient: { __sentinel: "stripeApiClient" },
}));

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/billing/setup-intent", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(createSetupIntent).not.toHaveBeenCalled();
  });

  it("returns 200 with the client secret from the wired deps", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (createSetupIntent as Mock).mockResolvedValue("seti_secret_123");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ clientSecret: "seti_secret_123" });
    expect(createSetupIntent).toHaveBeenCalledWith(
      billingDrizzle,
      stripeApiClient,
      userDrizzle
    );
  });

  it("returns 500 when createSetupIntent throws", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (createSetupIntent as Mock).mockRejectedValue(new Error("Stripe error"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
