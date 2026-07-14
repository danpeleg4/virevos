import React from "react";
import { render } from "vitest-browser-react";

import CookiePolicyPage from "@/app/cookie-policy/page";

describe("Cookie Policy Page", () => {
  it("renders Cookie Policy heading", async () => {
    const screen = await render(<CookiePolicyPage />);
    await expect
      .element(screen.getByText(/cookie policy/i))
      .toBeInTheDocument();
  });

  it("renders What Are Cookies section", async () => {
    const screen = await render(<CookiePolicyPage />);
    await expect
      .element(screen.getByText(/what are cookies/i))
      .toBeInTheDocument();
  });
});
