import React from "react";
import { render } from "vitest-browser-react";

import PrivacyPolicyPage from "@/app/privacy/page";

describe("Privacy Policy Page", () => {
  it("renders Privacy Policy heading", async () => {
    const screen = await render(<PrivacyPolicyPage />);
    await expect
      .element(screen.getByRole("heading", { name: /privacy policy/i }))
      .toBeInTheDocument();
  });

  it("renders Introduction section", async () => {
    const screen = await render(<PrivacyPolicyPage />);
    await expect.element(screen.getByText(/introduction/i)).toBeInTheDocument();
  });

  it("does not render a contact email", async () => {
    const screen = await render(<PrivacyPolicyPage />);
    await expect
      .element(screen.getByText(/@virevos\.com/i))
      .not.toBeInTheDocument();
  });

  it("does not render the Google Calendar integration section", async () => {
    const screen = await render(<PrivacyPolicyPage />);
    await expect
      .element(screen.getByText(/google oauth/i))
      .not.toBeInTheDocument();
  });
});
