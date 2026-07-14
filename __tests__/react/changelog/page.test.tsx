import React from "react";
import { render } from "vitest-browser-react";

import ChangelogPage from "@/app/changelog/page";

describe("Changelog Page", () => {
  it("renders Changelog heading", async () => {
    const screen = await render(<ChangelogPage />);
    await expect.element(screen.getByText("Changelog")).toBeInTheDocument();
  });

  it("renders some version entries", async () => {
    const screen = await render(<ChangelogPage />);
    await expect.element(screen.getByText(/v1\./i).first()).toBeInTheDocument();
  });

  it("renders description text", async () => {
    const screen = await render(<ChangelogPage />);
    await expect.element(screen.getByText(/every update/i)).toBeInTheDocument();
  });
});
