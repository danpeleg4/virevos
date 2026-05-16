import { GET } from "@/app/api/billing/route";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

const mockGetBillingOverview = vi.fn();

vi.mock("@/lib/billing", () => ({
  getBillingOverview: (...args: unknown[]) => mockGetBillingOverview(...args),
}));

import { currentUser } from "@clerk/nextjs/server";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/billing", () => {
  it("returns 401 when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with BillingOverview when authenticated", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_1" });
    const overview = {
      subscription: {
        plan: "professional",
        status: "active",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_pro",
        currentPeriodEnd: new Date("2026-04-01"),
        cancelAtPeriodEnd: false,
      },
      invoices: [
        {
          id: "inv_1",
          number: "INV-001",
          amountPaid: 2900,
          currency: "usd",
          status: "paid",
          pdfUrl: "https://example.com/inv.pdf",
          date: 1741996800,
          description: "Professional Plan",
        },
      ],
      paymentMethod: {
        brand: "visa",
        last4: "4242",
        expMonth: 12,
        expYear: 2027,
      },
    };
    mockGetBillingOverview.mockResolvedValue(overview);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscription.plan).toBe("professional");
    expect(body.paymentMethod.last4).toBe("4242");
    expect(body.invoices).toHaveLength(1);
  });

  it("returns 500 when getBillingOverview throws", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockGetBillingOverview.mockRejectedValue(new Error("Stripe error"));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
