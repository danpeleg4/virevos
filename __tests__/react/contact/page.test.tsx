import React from "react";
import { renderWithQueryClient } from "../../_helpers/render";

import ContactPage from "@/app/contact/page";

describe("Contact Page", () => {
  it("renders Contact Us heading", async () => {
    const screen = await renderWithQueryClient(<ContactPage />);
    await expect.element(screen.getByText(/contact us/i)).toBeInTheDocument();
  });

  it("renders General Inquiries section", async () => {
    const screen = await renderWithQueryClient(<ContactPage />);
    await expect
      .element(screen.getByText(/general inquiries/i))
      .toBeInTheDocument();
  });

  it("renders the demo request form", async () => {
    const screen = await renderWithQueryClient(<ContactPage />);
    await expect
      .element(screen.getByRole("button", { name: /schedule a demo/i }))
      .toBeInTheDocument();
  });
});
