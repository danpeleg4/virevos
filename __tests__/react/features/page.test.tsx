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

import FeaturesPage from "@/app/features/page";

describe("Features Page", () => {
  it("renders features content", () => {
    render(<FeaturesPage />);
    expect(screen.getAllByText(/AI Assistant/i).length).toBeGreaterThan(0);
  });

  it("renders navigation", () => {
    render(<FeaturesPage />);
    expect(screen.getAllByText(/virevos/i).length).toBeGreaterThan(0);
  });

  it("renders footer", () => {
    render(<FeaturesPage />);
    expect(screen.getByText(/© 2026 Virevos/i)).toBeInTheDocument();
  });
});
