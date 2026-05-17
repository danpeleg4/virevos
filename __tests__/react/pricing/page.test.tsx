import React from "react";
import { render, screen } from "@testing-library/react";

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

vi.mock("motion/react", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  const motion = new Proxy(
    {},
    {
      get: (_t, _tag: string) =>
        function MC({
          children,
          initial,
          animate,
          exit,
          variants,
          transition,
          viewport,
          whileInView,
          whileHover,
          whileTap,
          ...props
        }: Record<string, unknown>) {
          return createElement(_tag, props, children as React.ReactNode);
        },
    }
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

import PricingPage from "@/app/pricing/page";

describe("Pricing Page", () => {
  it("renders the hero heading", () => {
    render(<PricingPage />);
    expect(screen.getByText(/plans that scale/i)).toBeInTheDocument();
  });

  it("renders simple transparent pricing badge", () => {
    render(<PricingPage />);
    expect(
      screen.getByText(/simple, transparent pricing/i)
    ).toBeInTheDocument();
  });

  it("renders the comparison table heading", () => {
    render(<PricingPage />);
    expect(screen.getAllByText(/compare plans/i).length).toBeGreaterThan(0);
  });

  it("renders FAQ section heading", () => {
    render(<PricingPage />);
    expect(screen.getByText(/frequently asked questions/i)).toBeInTheDocument();
  });

  it("renders FAQ questions", () => {
    render(<PricingPage />);
    expect(screen.getByText(/can i change my plan later/i)).toBeInTheDocument();
    expect(
      screen.getByText(/what payment methods do you accept/i)
    ).toBeInTheDocument();
  });

  it("renders Start for free CTA button", () => {
    render(<PricingPage />);
    const startFreeButtons = screen.getAllByText(/start for free/i);
    expect(startFreeButtons.length).toBeGreaterThan(0);
  });

  it("renders Talk to sales button", () => {
    render(<PricingPage />);
    expect(screen.getAllByText(/talk to sales/i).length).toBeGreaterThan(0);
  });

  it("renders navigation", () => {
    render(<PricingPage />);
    expect(screen.getAllByText(/virevos/i).length).toBeGreaterThan(0);
  });

  it("renders footer", () => {
    render(<PricingPage />);
    expect(screen.getByText(/© 2026 Virevos/i)).toBeInTheDocument();
  });

  it("renders comparison table columns", () => {
    render(<PricingPage />);
    expect(screen.getAllByText(/Starter/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Professional/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Business/i).length).toBeGreaterThan(0);
  });
});
