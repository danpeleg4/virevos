import React from "react";
import { render, screen } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

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

  it("renders Professional plan price $79", () => {
    expect(screen.getByText("$79")).toBeInTheDocument();
  });

  it("renders Business plan price $129", () => {
    expect(screen.getByText("$129")).toBeInTheDocument();
  });
});
