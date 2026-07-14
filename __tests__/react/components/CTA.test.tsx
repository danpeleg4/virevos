import React from "react";
import { render, type RenderResult } from "vitest-browser-react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { CTA } from "@/app/components/CTA";

describe("CTA", () => {
  let screen: RenderResult;

  beforeEach(async () => {
    mockPush.mockClear();
    screen = await render(<CTA />);
  });

  it("renders the main heading", async () => {
    await expect
      .element(screen.getByText(/ready to transform/i))
      .toBeInTheDocument();
  });

  it("renders 'Get started for free' button", async () => {
    await expect
      .element(screen.getByRole("button", { name: /get started for free/i }))
      .toBeInTheDocument();
  });

  it("renders 'Schedule a demo' button", async () => {
    await expect
      .element(screen.getByRole("button", { name: /schedule a demo/i }))
      .toBeInTheDocument();
  });

  it("navigates to /onboard on 'Get started for free' click", async () => {
    await screen.getByRole("button", { name: /get started for free/i }).click();
    expect(mockPush).toHaveBeenCalledWith("/onboard");
  });

  it("navigates to /contact on 'Schedule a demo' click", async () => {
    await screen.getByRole("button", { name: /schedule a demo/i }).click();
    expect(mockPush).toHaveBeenCalledWith("/contact");
  });

  it("renders trust indicators", async () => {
    await expect
      .element(screen.getByText(/free plan/i).first())
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/no credit card required/i).first())
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/cancel anytime/i).first())
      .toBeInTheDocument();
  });

  it("renders the badge text", async () => {
    await expect
      .element(screen.getByText(/join virevos today/i))
      .toBeInTheDocument();
  });
});
