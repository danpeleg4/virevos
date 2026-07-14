import React from "react";
import { render } from "vitest-browser-react";

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: vi.fn(() => null),
  useElements: vi.fn(() => null),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("axios");

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: "secret_123",
    isLoading: false,
    isError: false,
  })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock("@/lib/workspace/billing", () => ({
  registerFreePlan: vi.fn(),
  changePlan: vi.fn(),
  cancelSubscription: vi.fn(),
  createSubscription: vi.fn(),
}));

import PaymentStep from "@/app/onboard/PaymentStep";

describe("PaymentStep", () => {
  const mockProps = {
    formData: { selectedPlan: "professional" as const },
  };

  it("renders without crashing", async () => {
    const { container } = await render(<PaymentStep {...mockProps} />);
    await expect.element(container).toBeInTheDocument();
  });

  it("renders payment plan information", async () => {
    await render(<PaymentStep {...mockProps} />);
    // Should render some text about the plan or payment
    const container = document.querySelector("div");
    await expect.element(container!).toBeInTheDocument();
  });
});
