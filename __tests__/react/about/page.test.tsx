import React from "react";
import { render } from "vitest-browser-react";

import AboutPage from "@/app/about/page";

describe("About Page", () => {
  it("renders page heading", async () => {
    const screen = await render(<AboutPage />);
    await expect
      .element(screen.getByText(/about virevos/i))
      .toBeInTheDocument();
  });

  it("renders Our Mission section", async () => {
    const screen = await render(<AboutPage />);
    await expect.element(screen.getByText(/our mission/i)).toBeInTheDocument();
  });

  it("renders Our Values section", async () => {
    const screen = await render(<AboutPage />);
    await expect.element(screen.getByText(/our values/i)).toBeInTheDocument();
  });
});
