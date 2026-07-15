import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: vi.fn(() => null),
  useElements: vi.fn(() => null),
}));

import Billing from "@/app/workspace/billing/page";

describe("Billing Page", () => {
  it("renders current plan name", async () => {
    const screen = await renderWithQueryClient(<Billing />);
    await expect
      .element(screen.getByText(/professional/i).first())
      .toBeInTheDocument();
  });

  it("renders usage section", async () => {
    const screen = await renderWithQueryClient(<Billing />);
    await expect
      .element(screen.getByText(/clients/i).first())
      .toBeInTheDocument();
  });

  it("renders billing history", async () => {
    const screen = await renderWithQueryClient(<Billing />);
    await expect
      .element(screen.getByText(/billing history/i))
      .toBeInTheDocument();
  });

  it("renders payment method info", async () => {
    const screen = await renderWithQueryClient(<Billing />);
    await expect.element(screen.getByText(/visa/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/4242/i)).toBeInTheDocument();
  });

  it("cancels the subscription through the API", async () => {
    let postBody: unknown;
    worker.use(
      http.post("/api/billing", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );

    const screen = await renderWithQueryClient(<Billing />);
    await screen.getByRole("button", { name: /cancel subscription/i }).click();
    // confirm dialog
    await screen
      .getByRole("button", { name: /^cancel subscription$/i })
      .last()
      .click();

    await vi.waitFor(() => expect(postBody).toEqual({ type: "cancel" }));
  });
});
