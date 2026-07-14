import React from "react";
import { render } from "vitest-browser-react";

import TermsPage from "@/app/terms/page";

describe("Terms of Service Page", () => {
  it("renders Terms heading", async () => {
    const screen = await render(<TermsPage />);
    await expect
      .element(screen.getByRole("heading", { name: /terms of service/i }))
      .toBeInTheDocument();
  });

  it("renders Acceptance of Terms section", async () => {
    const screen = await render(<TermsPage />);
    await expect
      .element(screen.getByText(/acceptance of terms/i))
      .toBeInTheDocument();
  });

  it("renders Use of Service section", async () => {
    const screen = await render(<TermsPage />);
    await expect
      .element(screen.getByText(/use of service/i))
      .toBeInTheDocument();
  });
});
