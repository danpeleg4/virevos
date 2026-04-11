import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: jest.fn(() => "/"),
  useParams: jest.fn(() => ({})),
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
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => children };
});

import { Hero } from "@/app/components/Hero";

describe("Hero", () => {
  beforeEach(() => {
    mockPush.mockClear();
    render(<Hero />);
  });

  it("renders the brand name", () => {
    expect(screen.getByText(/virevos/i)).toBeInTheDocument();
  });

  it("renders the main tagline", () => {
    expect(screen.getByText(/work flows better/i)).toBeInTheDocument();
  });

  it("renders 'Start for free' button", () => {
    expect(screen.getByRole("button", { name: /start for free/i })).toBeInTheDocument();
  });

  it("navigates to /onboard when 'Start for free' is clicked", () => {
    fireEvent.click(screen.getByRole("button", { name: /start for free/i }));
    expect(mockPush).toHaveBeenCalledWith("/onboard");
  });

  it("renders 'Watch demo' button", () => {
    expect(screen.getByRole("button", { name: /watch demo/i })).toBeInTheDocument();
  });

  it("renders social proof items", () => {
    expect(screen.getByText(/free plan/i)).toBeInTheDocument();
    expect(screen.getByText(/no credit card required/i)).toBeInTheDocument();
    expect(screen.getByText(/cancel anytime/i)).toBeInTheDocument();
  });
});
