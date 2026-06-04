import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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
});
