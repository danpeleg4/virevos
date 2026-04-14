import React from "react";
import { render, screen } from "@testing-library/react";

import AboutPage from "@/app/about/page";

describe("About Page", () => {
  it("renders page heading", () => {
    render(<AboutPage />);
    expect(screen.getByText(/about virevos/i)).toBeInTheDocument();
  });

  it("renders Our Mission section", () => {
    render(<AboutPage />);
    expect(screen.getByText(/our mission/i)).toBeInTheDocument();
  });

  it("renders Our Values section", () => {
    render(<AboutPage />);
    expect(screen.getByText(/our values/i)).toBeInTheDocument();
  });
});
