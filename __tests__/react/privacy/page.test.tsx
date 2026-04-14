import React from "react";
import { render, screen } from "@testing-library/react";

import PrivacyPolicyPage from "@/app/privacy/page";

describe("Privacy Policy Page", () => {
  it("renders Privacy Policy heading", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByRole("heading", { name: /privacy policy/i })
    ).toBeInTheDocument();
  });

  it("renders Introduction section", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText(/introduction/i)).toBeInTheDocument();
  });
});
