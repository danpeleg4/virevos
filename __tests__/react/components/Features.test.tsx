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

  it("renders 'Client Workflow Automation' feature", () => {
    expect(screen.getByText(/client workflow automation/i)).toBeInTheDocument();
  });

  it("renders 'Client Collaboration' feature", () => {
    expect(screen.getByText(/client collaboration/i)).toBeInTheDocument();
  });

  it("renders 'Smart Project Scheduling' feature", () => {
    expect(screen.getByText(/smart project scheduling/i)).toBeInTheDocument();
  });

  it("renders 'AI Assistant' feature", () => {
    expect(screen.getByText(/ai assistant/i)).toBeInTheDocument();
  });

  it("renders 'Freelancer Analytics' feature", () => {
    expect(screen.getByText(/freelancer analytics/i)).toBeInTheDocument();
  });

  it("renders 'Built-In Meetings' feature", () => {
    expect(screen.getByText(/built-in meetings/i)).toBeInTheDocument();
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
