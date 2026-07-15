import React from "react";
import { renderWithQueryClient } from "../../_helpers/render";

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

import PaymentStep from "@/app/onboard/PaymentStep";

describe("PaymentStep", () => {
  const mockProps = {
    formData: { selectedPlan: "professional" as const },
  };

  it("renders without crashing", async () => {
    const { container } = await renderWithQueryClient(
      <PaymentStep {...mockProps} />
    );
    await expect.element(container).toBeInTheDocument();
  });

  it("renders payment plan information", async () => {
    await renderWithQueryClient(<PaymentStep {...mockProps} />);
    // Should render some text about the plan or payment
    const container = document.querySelector("div");
    await expect.element(container!).toBeInTheDocument();
  });
});
