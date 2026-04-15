import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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

import { CTA } from "@/app/components/CTA";

describe("CTA", () => {
  beforeEach(() => {
    mockPush.mockClear();
    render(<CTA />);
  });

  it("renders the main heading", () => {
    expect(screen.getByText(/ready to transform/i)).toBeInTheDocument();
  });

  it("renders 'Get started for free' button", () => {
    expect(
      screen.getByRole("button", { name: /get started for free/i })
    ).toBeInTheDocument();
  });

  it("renders 'Schedule a demo' button", () => {
    expect(
      screen.getByRole("button", { name: /schedule a demo/i })
    ).toBeInTheDocument();
  });

  it("navigates to /onboard on 'Get started for free' click", () => {
    fireEvent.click(
      screen.getByRole("button", { name: /get started for free/i })
    );
    expect(mockPush).toHaveBeenCalledWith("/onboard");
  });

  it("navigates to /contact on 'Schedule a demo' click", () => {
    fireEvent.click(screen.getByRole("button", { name: /schedule a demo/i }));
    expect(mockPush).toHaveBeenCalledWith("/contact");
  });

  it("renders trust indicators", () => {
    expect(screen.getAllByText(/free plan/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/no credit card required/i).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/cancel anytime/i).length).toBeGreaterThan(0);
  });

  it("renders stats section", () => {
    expect(screen.getByText(/1000\+/)).toBeInTheDocument();
    expect(screen.getByText(/active users/i)).toBeInTheDocument();
  });
});
