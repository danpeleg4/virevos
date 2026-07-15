import { http, HttpResponse, type RequestHandler } from "msw";

export const billingOverviewFixture = {
  subscription: {
    plan: "professional",
    status: "active",
    currentPeriodEnd: "2026-06-01",
    cancelAtPeriodEnd: false,
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_123",
    stripePriceId: "price_pro",
  },
  aiCredits: 120,
  storage: 10,
  invoices: [
    {
      id: "inv_1",
      amountPaid: 2900,
      currency: "usd",
      status: "paid",
      date: 1746057600,
      pdfUrl: "https://stripe.com/inv_1.pdf",
      number: "INV-001",
      description: null,
    },
  ],
  paymentMethod: { brand: "visa", last4: "4242", expMonth: 12, expYear: 2030 },
};

export const billingHandlers: RequestHandler[] = [
  http.get("/api/billing", () => HttpResponse.json(billingOverviewFixture)),

  http.post("/api/billing", () => HttpResponse.json({ success: true })),

  http.get("/api/billing/setup-intent", () =>
    HttpResponse.json({ clientSecret: "seti_secret_1" })
  ),
];
