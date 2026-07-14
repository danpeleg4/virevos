import React from "react";
import { render, type RenderResult } from "vitest-browser-react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

vi.mock("@/app/hooks/useAuthUser", () => ({
  useAuthUser: () => ({ data: null, isPending: false }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    auth: { signOut: vi.fn() },
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));

import PricingPage from "@/app/pricing/page";

describe("Pricing Page", () => {
  let screen: RenderResult;

  beforeEach(async () => {
    screen = await render(<PricingPage />);
  });

  it("renders the hero heading", async () => {
    await expect
      .element(screen.getByText(/plans that scale/i))
      .toBeInTheDocument();
  });

  it("renders simple transparent pricing badge", async () => {
    await expect
      .element(screen.getByText(/simple, transparent pricing/i))
      .toBeInTheDocument();
  });

  it("renders the comparison table heading", async () => {
    await expect
      .element(screen.getByText(/compare plans/i).first())
      .toBeInTheDocument();
  });

  it("renders FAQ section heading", async () => {
    await expect
      .element(screen.getByText(/frequently asked questions/i))
      .toBeInTheDocument();
  });

  it("renders FAQ questions", async () => {
    await expect
      .element(screen.getByText(/can i change my plan later/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/what payment methods do you accept/i))
      .toBeInTheDocument();
  });

  it("renders Start for free CTA button", async () => {
    await expect
      .element(screen.getByText(/start for free/i).first())
      .toBeInTheDocument();
  });

  it("renders Talk to sales button", async () => {
    await expect
      .element(screen.getByText(/talk to sales/i).first())
      .toBeInTheDocument();
  });

  it("renders navigation", async () => {
    await expect
      .element(screen.getByText(/virevos/i).first())
      .toBeInTheDocument();
  });

  it("renders footer", async () => {
    await expect
      .element(screen.getByText(/© 2026 Virevos/i))
      .toBeInTheDocument();
  });

  it("renders comparison table columns", async () => {
    await expect
      .element(screen.getByText(/Starter/i).first())
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/Professional/i).first())
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/Business/i).first())
      .toBeInTheDocument();
  });
});
