import React from "react";
import { renderWithQueryClient } from "../../../_helpers/render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import CasesPage from "@/app/workspace/cases/page";

// default MSW fixtures serve "Estate Case" (active) and "Contract Review" (completed)

describe("Cases Page", () => {
  it("renders case names", async () => {
    const screen = await renderWithQueryClient(<CasesPage />);
    await expect.element(screen.getByText("Estate Case")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Contract Review"))
      .toBeInTheDocument();
  });

  it("renders case status indicators", async () => {
    const screen = await renderWithQueryClient(<CasesPage />);
    await expect
      .element(screen.getByText(/active|completed/i).first())
      .toBeInTheDocument();
  });
});
