import React from "react";
import { render, type RenderResult } from "vitest-browser-react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import Features from "@/app/components/Features";

describe("Features", () => {
  let screen: RenderResult;

  beforeEach(async () => {
    screen = await render(<Features />);
  });

  it("renders 'Case Lifecycle Automation' feature", async () => {
    await expect
      .element(screen.getByText(/case lifecycle automation/i))
      .toBeInTheDocument();
  });

  it("renders 'Secure Client Portal' feature", async () => {
    await expect
      .element(screen.getByText(/secure client portal/i))
      .toBeInTheDocument();
  });

  it("renders 'Critical Deadline Tracking' feature", async () => {
    await expect
      .element(screen.getByText(/critical deadline tracking/i))
      .toBeInTheDocument();
  });

  it("renders 'Autonomous AI Audit' feature", async () => {
    await expect
      .element(screen.getByText(/autonomous ai audit/i))
      .toBeInTheDocument();
  });

  it("renders 'Practice Insights' feature", async () => {
    await expect
      .element(screen.getByText(/practice insights/i))
      .toBeInTheDocument();
  });

  it("renders 'AI Consultations' feature", async () => {
    await expect
      .element(screen.getByText(/ai consultations/i))
      .toBeInTheDocument();
  });
});
