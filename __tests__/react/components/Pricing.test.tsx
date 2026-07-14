import React from "react";
import { render, type RenderResult } from "vitest-browser-react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { Pricing } from "@/app/components/Pricing";

describe("Pricing", () => {
  let screen: RenderResult;

  beforeEach(async () => {
    screen = await render(<Pricing />);
  });

  it("renders Starter plan", async () => {
    await expect
      .element(screen.getByText(/starter/i).first())
      .toBeInTheDocument();
  });

  it("renders Professional plan", async () => {
    await expect
      .element(screen.getByText(/professional/i).first())
      .toBeInTheDocument();
  });

  it("renders Business plan", async () => {
    await expect
      .element(screen.getByText(/business/i).first())
      .toBeInTheDocument();
  });

  it("renders 'Most Popular' badge", async () => {
    await expect.element(screen.getByText(/most popular/i)).toBeInTheDocument();
  });

  it("renders Starter plan price $0", async () => {
    await expect
      .element(screen.getByText("$0", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders Professional plan price $79", async () => {
    await expect
      .element(screen.getByText("$79", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders Business plan price $129", async () => {
    await expect
      .element(screen.getByText("$129", { exact: true }))
      .toBeInTheDocument();
  });
});
