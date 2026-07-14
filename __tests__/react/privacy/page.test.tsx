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
});
