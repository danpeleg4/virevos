import React from "react";
import { render, screen } from "@testing-library/react";

import CookiePolicyPage from "@/app/cookie-policy/page";

describe("Cookie Policy Page", () => {
  it("renders Cookie Policy heading", () => {
    render(<CookiePolicyPage />);
    expect(screen.getByText(/cookie policy/i)).toBeInTheDocument();
  });

  it("renders What Are Cookies section", () => {
    render(<CookiePolicyPage />);
    expect(screen.getByText(/what are cookies/i)).toBeInTheDocument();
  });
});
