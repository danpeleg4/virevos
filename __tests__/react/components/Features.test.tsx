import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
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

import Features from "@/app/components/Features";

describe("Features", () => {
  beforeEach(() => {
    render(<Features />);
  });

  it("renders 'Case Lifecycle Automation' feature", () => {
    expect(screen.getByText(/case lifecycle automation/i)).toBeInTheDocument();
  });

  it("renders 'Secure Client Portal' feature", () => {
    expect(screen.getByText(/secure client portal/i)).toBeInTheDocument();
  });

  it("renders 'Critical Deadline Tracking' feature", () => {
    expect(screen.getByText(/critical deadline tracking/i)).toBeInTheDocument();
  });

  it("renders 'Autonomous AI Audit' feature", () => {
    expect(screen.getByText(/autonomous ai audit/i)).toBeInTheDocument();
  });

  it("renders 'Practice Insights' feature", () => {
    expect(screen.getByText(/practice insights/i)).toBeInTheDocument();
  });

  it("renders 'AI Consultations' feature", () => {
    expect(screen.getByText(/ai consultations/i)).toBeInTheDocument();
  });

  it("renders 'Explore all features' CTA", () => {
    expect(
      screen.getByRole("button", { name: /explore all features/i })
    ).toBeInTheDocument();
  });

  it("renders 'Watch demo' CTA", () => {
    expect(
      screen.getByRole("button", { name: /watch demo/i })
    ).toBeInTheDocument();
  });
});
