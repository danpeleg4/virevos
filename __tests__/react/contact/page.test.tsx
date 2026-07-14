import React from "react";
import { render } from "vitest-browser-react";

import ContactPage from "@/app/contact/page";

describe("Contact Page", () => {
  it("renders Contact Us heading", async () => {
    const screen = await render(<ContactPage />);
    await expect.element(screen.getByText(/contact us/i)).toBeInTheDocument();
  });

  it("renders General Inquiries section", async () => {
    const screen = await render(<ContactPage />);
    await expect
      .element(screen.getByText(/general inquiries/i))
      .toBeInTheDocument();
  });
});
