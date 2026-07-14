import React from "react";
import { render } from "vitest-browser-react";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("axios");

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: vi.fn(() => null),
  useElements: vi.fn(() => null),
}));

vi.mock("@/lib/workspace/billing", () => ({
  changePlan: vi.fn(),
  cancelSubscription: vi.fn(),
  resubscribe: vi.fn(),
  updatePaymentMethod: vi.fn(),
}));

const mockBillingData = {
  subscription: {
    plan: "professional",
    status: "active",
    currentPeriodEnd: "2026-06-01",
    cancelAtPeriodEnd: false,
    stripeSubscriptionId: "sub_123",
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
    },
  ],
  paymentMethod: { brand: "visa", last4: "4242" },
};

import Billing from "@/app/workspace/billing/page";

describe("Billing Page", () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseQuery.mockReturnValue({
      data: mockBillingData,
      isLoading: false,
      error: null,
    });
  });

  it("renders current plan name", async () => {
    const screen = await render(<Billing />);
    await expect
      .element(screen.getByText(/professional/i).first())
      .toBeInTheDocument();
  });

  it("renders usage section", async () => {
    const screen = await render(<Billing />);
    await expect
      .element(screen.getByText(/clients/i).first())
      .toBeInTheDocument();
  });

  it("renders billing history", async () => {
    const screen = await render(<Billing />);
    await expect
      .element(screen.getByText(/billing history/i))
      .toBeInTheDocument();
  });

  it("renders payment method info", async () => {
    const screen = await render(<Billing />);
    await expect.element(screen.getByText(/visa/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/4242/i)).toBeInTheDocument();
  });
});
