import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isSignedIn: false, user: null, isLoaded: true }),
  SignOutButton: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  UserButton: () => <div data-testid="user-button" />,
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({ resolvedTheme: "light", setTheme: vi.fn() })),
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

import Page from "@/app/page";

describe("Root Page (Landing)", () => {
  beforeEach(() => {
    render(<Page />);
  });

  it("renders Hero section", () => {
    expect(screen.getByText(/practice flows better/i)).toBeInTheDocument();
  });

  it("renders Features section", () => {
    expect(screen.getByText(/case lifecycle automation/i)).toBeInTheDocument();
  });

  it("renders CTA section", () => {
    expect(screen.getByText(/ready to transform/i)).toBeInTheDocument();
  });

  it("renders Footer section", () => {
    expect(screen.getByText(/© 2026 Virevos/i)).toBeInTheDocument();
  });

  it("renders navigation", () => {
    // Nav renders the brand
    const vireTypes = screen.getAllByText(/virevos/i);
    expect(vireTypes.length).toBeGreaterThan(0);
  });
});
