import React from "react";
import { render, screen } from "@testing-library/react";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isSignedIn: false, user: null, isLoaded: true }),
  SignOutButton: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("motion/react", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
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
          return createElement(
            _tag,
            props,
            children as React.ReactNode
          );
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
    // Features page renders main feature titles
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
