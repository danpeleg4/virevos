import React from "react";
import { render, screen } from "@testing-library/react";

import { Footer } from "@/app/components/Footer";

describe("Footer", () => {
  beforeEach(() => {
    render(<Footer />);
  });

  it("renders the brand name", () => {
    expect(screen.getByText("Virevos")).toBeInTheDocument();
  });

  it("renders Product section heading", () => {
    expect(screen.getByText("Product")).toBeInTheDocument();
  });

  it("renders Company section heading", () => {
    expect(screen.getByText("Company")).toBeInTheDocument();
  });

  it("renders Legal section heading", () => {
    expect(screen.getByText("Legal")).toBeInTheDocument();
  });

  it("renders Product links", () => {
    expect(screen.getByRole("link", { name: /features/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pricing/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /changelog/i })
    ).toBeInTheDocument();
  });

  it("renders Company links", () => {
    expect(screen.getByRole("link", { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /blog/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contact/i })).toBeInTheDocument();
  });

  it("renders Legal links", () => {
    expect(
      screen.getAllByRole("link", { name: /privacy/i }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: /terms/i }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: /cookie policy/i })
    ).toBeInTheDocument();
  });

  it("renders copyright notice", () => {
    expect(screen.getByText(/© 2026 Virevos/i)).toBeInTheDocument();
  });
});
