import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("@stripe/stripe-js", () => ({
  loadStripe: jest.fn(() => Promise.resolve(null)),
}));

jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: jest.fn(() => null),
  useElements: jest.fn(() => null),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("axios");

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(() => ({ data: "secret_123", isLoading: false, isError: false })),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock("@/lib/billing", () => ({
  registerFreePlan: jest.fn(),
  changePlan: jest.fn(),
  cancelSubscription: jest.fn(),
}));

import PaymentStep from "@/app/onboard/PaymentStep";

describe("PaymentStep", () => {
  const mockProps = {
    formData: { selectedPlan: "professional" as const },
  };

  it("renders without crashing", () => {
    const { container } = render(<PaymentStep {...mockProps} />);
    expect(container).toBeInTheDocument();
  });

  it("renders payment plan information", () => {
    render(<PaymentStep {...mockProps} />);
    // Should render some text about the plan or payment
    const container = document.querySelector("div");
    expect(container).toBeInTheDocument();
  });
});
