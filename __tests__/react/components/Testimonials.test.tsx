import React from "react";
import { render, screen } from "@testing-library/react";

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
            _tag as keyof JSX.IntrinsicElements,
            props as JSX.IntrinsicElements[keyof JSX.IntrinsicElements],
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

import { Testimonials } from "@/app/components/Testimonials";

describe("Testimonials", () => {
  beforeEach(() => {
    render(<Testimonials />);
  });

  it("renders section heading", () => {
    expect(
      screen.getByText(/loved by individuals worldwide/i)
    ).toBeInTheDocument();
  });

  it("renders testimonial authors", () => {
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("Michael Rodriguez")).toBeInTheDocument();
    expect(screen.getByText("Emily Thompson")).toBeInTheDocument();
  });

  it("renders company names in testimonials", () => {
    expect(screen.getAllByText(/TechCorp/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/StartupXYZ/).length).toBeGreaterThan(0);
  });

  it("renders review count", () => {
    expect(screen.getByText(/2,000\+ reviews/i)).toBeInTheDocument();
  });

  it("renders trusted companies section", () => {
    expect(
      screen.getByText(/trusted by leading companies/i)
    ).toBeInTheDocument();
  });
});
