import React from "react";
import { render, screen } from "@testing-library/react";

import ContactPage from "@/app/contact/page";

describe("Contact Page", () => {
  it("renders Contact Us heading", () => {
    render(<ContactPage />);
    expect(screen.getByText(/contact us/i)).toBeInTheDocument();
  });

  it("renders General Inquiries section", () => {
    render(<ContactPage />);
    expect(screen.getByText(/general inquiries/i)).toBeInTheDocument();
  });
});
