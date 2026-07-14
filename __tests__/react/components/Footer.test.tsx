import React from "react";
import { render, type RenderResult } from "vitest-browser-react";

import { Footer } from "@/app/components/Footer";

describe("Footer", () => {
  let screen: RenderResult;

  beforeEach(async () => {
    screen = await render(<Footer />);
  });

  it("renders the brand name", async () => {
    await expect
      .element(screen.getByText("Virevos", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders Product section heading", async () => {
    await expect
      .element(screen.getByText("Product", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders Company section heading", async () => {
    await expect
      .element(screen.getByText("Company", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders Legal section heading", async () => {
    await expect
      .element(screen.getByText("Legal", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders Product links", async () => {
    await expect
      .element(screen.getByRole("link", { name: /features/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: /pricing/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: /changelog/i }))
      .toBeInTheDocument();
  });

  it("renders Company links", async () => {
    await expect
      .element(screen.getByRole("link", { name: /about/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: /blog/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: /contact/i }))
      .toBeInTheDocument();
  });

  it("renders Legal links", async () => {
    await expect
      .element(screen.getByRole("link", { name: /privacy/i }).first())
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: /terms/i }).first())
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: /cookie policy/i }))
      .toBeInTheDocument();
  });

  it("renders copyright notice", async () => {
    await expect
      .element(screen.getByText(/© 2026 Virevos/i))
      .toBeInTheDocument();
  });
});
