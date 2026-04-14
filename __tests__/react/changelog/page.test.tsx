import React from "react";
import { render, screen } from "@testing-library/react";

import ChangelogPage from "@/app/changelog/page";

describe("Changelog Page", () => {
  it("renders Changelog heading", () => {
    render(<ChangelogPage />);
    expect(screen.getByText("Changelog")).toBeInTheDocument();
  });

  it("renders some version entries", () => {
    render(<ChangelogPage />);
    expect(screen.getAllByText(/v1\./i).length).toBeGreaterThan(0);
  });

  it("renders description text", () => {
    render(<ChangelogPage />);
    expect(screen.getByText(/every update/i)).toBeInTheDocument();
  });
});
