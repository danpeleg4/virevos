import React from "react";
import { render, screen } from "@testing-library/react";

import TermsPage from "@/app/terms/page";

describe("Terms of Service Page", () => {
  it("renders Terms heading", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { name: /terms of service/i })).toBeInTheDocument();
  });

  it("renders Acceptance of Terms section", () => {
    render(<TermsPage />);
    expect(screen.getByText(/acceptance of terms/i)).toBeInTheDocument();
  });

  it("renders Use of Service section", () => {
    render(<TermsPage />);
    expect(screen.getByText(/use of service/i)).toBeInTheDocument();
  });
});
