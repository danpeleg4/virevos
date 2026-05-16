import React from "react";
import { render, screen } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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

import { Pricing } from "@/app/components/Pricing";

describe("Pricing", () => {
  beforeEach(() => {
    render(<Pricing />);
  });

  it("renders Starter plan", () => {
    expect(screen.getAllByText(/starter/i).length).toBeGreaterThan(0);
  });

  it("renders Professional plan", () => {
    expect(screen.getAllByText(/professional/i).length).toBeGreaterThan(0);
  });

  it("renders Business plan", () => {
    expect(screen.getAllByText(/business/i).length).toBeGreaterThan(0);
  });

  it("renders 'Most Popular' badge", () => {
    expect(screen.getByText(/most popular/i)).toBeInTheDocument();
  });

  it("renders Starter plan price $0", () => {
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("renders Professional plan price $29", () => {
    expect(screen.getByText("$29")).toBeInTheDocument();
  });

  it("renders Business plan price $79", () => {
    expect(screen.getByText("$79")).toBeInTheDocument();
  });
});
