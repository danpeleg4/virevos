import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: vi.fn(() => "/"),
  useParams: vi.fn(() => ({})),
}));

import { Hero } from "@/app/components/Hero";

describe("Hero", () => {
  beforeEach(() => {
    render(<Hero />);
  });

  it("renders the brand name", () => {
    expect(screen.getAllByText(/virevos/i).length).toBeGreaterThan(0);
  });

  it("renders the main tagline", () => {
    expect(screen.getByText(/practice flows better/i)).toBeInTheDocument();
  });

  it("renders the announcement badge", () => {
    expect(
      screen.getByText(/introducing ai-powered automations/i)
    ).toBeInTheDocument();
  });

  it("renders social proof items", () => {
    expect(screen.getByText(/free plan/i)).toBeInTheDocument();
    expect(screen.getByText(/no credit card required/i)).toBeInTheDocument();
    expect(screen.getByText(/cancel anytime/i)).toBeInTheDocument();
  });
});
