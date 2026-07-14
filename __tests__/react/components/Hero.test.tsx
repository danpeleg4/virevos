import React from "react";
import { render, type RenderResult } from "vitest-browser-react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: vi.fn(() => "/"),
  useParams: vi.fn(() => ({})),
}));

import { Hero } from "@/app/components/Hero";

describe("Hero", () => {
  let screen: RenderResult;

  beforeEach(async () => {
    screen = await render(<Hero />);
  });

  it("renders the brand name", async () => {
    await expect
      .element(screen.getByText(/virevos/i).first())
      .toBeInTheDocument();
  });

  it("renders the main tagline", async () => {
    await expect
      .element(screen.getByText(/practice flows better/i))
      .toBeInTheDocument();
  });

  it("renders the announcement badge", async () => {
    await expect
      .element(screen.getByText(/introducing ai-powered automations/i))
      .toBeInTheDocument();
  });

  it("renders social proof items", async () => {
    await expect.element(screen.getByText(/free plan/i)).toBeInTheDocument();
    await expect
      .element(screen.getByText(/no credit card required/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/cancel anytime/i))
      .toBeInTheDocument();
  });
});
