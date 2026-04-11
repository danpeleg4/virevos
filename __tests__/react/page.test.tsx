import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: jest.fn(() => "/"),
}));

jest.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isSignedIn: false, user: null, isLoaded: true }),
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <div data-testid="user-button" />,
}));

jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({ resolvedTheme: "light", setTheme: jest.fn() })),
}));

jest.mock("motion/react", () => {
  const R = require("react");
  const motion = new Proxy(
    {},
    {
      get: (_t, tag: string) =>
        function MC({ children, initial, animate, exit, variants, transition, viewport, whileInView, whileHover, whileTap, ...props }: Record<string, unknown>) {
          return R.createElement(tag, props, children);
        },
    }
  );
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});

import Page from "@/app/page";

describe("Root Page (Landing)", () => {
  beforeEach(() => {
    render(<Page />);
  });

  it("renders Hero section", () => {
    expect(screen.getByText(/work flows better/i)).toBeInTheDocument();
  });

  it("renders Features section", () => {
    expect(screen.getByText(/client workflow automation/i)).toBeInTheDocument();
  });

  it("renders Pricing section", () => {
    expect(screen.getAllByText(/starter/i).length).toBeGreaterThan(0);
  });

  it("renders Testimonials section", () => {
    expect(screen.getByText(/loved by individuals worldwide/i)).toBeInTheDocument();
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
