import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: jest.fn(() => "/"),
  useParams: jest.fn(() => ({})),
}));

import { Hero } from "@/app/components/Hero";

describe("Hero", () => {
  beforeEach(() => {
    mockPush.mockClear();
    render(<Hero />);
  });

  it("renders the brand name", () => {
    expect(screen.getAllByText(/virevos/i).length).toBeGreaterThan(0);
  });

  it("renders the main tagline", () => {
    expect(screen.getByText(/practice flows better/i)).toBeInTheDocument();
  });

  it("renders 'Start for free' button", () => {
    expect(
      screen.getByRole("button", { name: /start for free/i })
    ).toBeInTheDocument();
  });

  it("navigates to /onboard when 'Start for free' is clicked", () => {
    fireEvent.click(screen.getByRole("button", { name: /start for free/i }));
    expect(mockPush).toHaveBeenCalledWith("/onboard");
  });

  it("renders 'Watch demo' button", () => {
    expect(
      screen.getByRole("button", { name: /watch demo/i })
    ).toBeInTheDocument();
  });

  it("renders social proof items", () => {
    expect(screen.getByText(/free plan/i)).toBeInTheDocument();
    expect(screen.getByText(/no credit card required/i)).toBeInTheDocument();
    expect(screen.getByText(/cancel anytime/i)).toBeInTheDocument();
  });
});
