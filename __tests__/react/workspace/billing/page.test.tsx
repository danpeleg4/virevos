import React from "react";
import { render, screen } from "@testing-library/react";

const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("axios");

jest.mock("@stripe/stripe-js", () => ({
  loadStripe: jest.fn(() => Promise.resolve(null)),
}));

jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: jest.fn(() => null),
  useElements: jest.fn(() => null),
}));

jest.mock("@/lib/billing", () => ({
  changePlan: jest.fn(),
  cancelSubscription: jest.fn(),
  resubscribe: jest.fn(),
  updatePaymentMethod: jest.fn(),
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
    mockUseMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseQuery.mockReturnValue({
      data: mockBillingData,
      isLoading: false,
      error: null,
    });
  });

  it("renders current plan name", () => {
    render(<Billing />);
    expect(screen.getAllByText(/professional/i).length).toBeGreaterThan(0);
  });

  it("renders usage section", () => {
    render(<Billing />);
    expect(screen.getAllByText(/clients/i).length).toBeGreaterThan(0);
  });

  it("renders billing history", () => {
    render(<Billing />);
    expect(screen.getByText(/billing history/i)).toBeInTheDocument();
  });

  it("renders payment method info", () => {
    render(<Billing />);
    expect(screen.getByText(/visa/i)).toBeInTheDocument();
    expect(screen.getByText(/4242/i)).toBeInTheDocument();
  });
});
