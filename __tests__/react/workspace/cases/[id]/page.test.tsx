import React, { Suspense } from "react";
import { renderWithQueryClient } from "../../../../_helpers/render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

import CasePage from "@/app/workspace/cases/[id]/page";

// default MSW fixtures serve case 1 as "Estate Case" owned by "Jane Client"
// with one task ("Design UI mockups") and one file ("contract.pdf")

const renderPage = () =>
  renderWithQueryClient(
    <Suspense fallback={<div>Loading...</div>}>
      <CasePage params={Promise.resolve({ id: "1" })} />
    </Suspense>
  );

describe("Case Detail Page", () => {
  it("renders case name", async () => {
    const screen = await renderPage();
    await expect.element(screen.getByText("Estate Case")).toBeInTheDocument();
  });

  it("renders task list", async () => {
    const screen = await renderPage();
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();
  });

  it("renders Files section", async () => {
    const screen = await renderPage();
    await expect
      .element(screen.getByText(/files/i).first())
      .toBeInTheDocument();
  });

  it("renders Notes section", async () => {
    const screen = await renderPage();
    await expect
      .element(screen.getByText(/notes/i).first())
      .toBeInTheDocument();
  });

  it("renders client name", async () => {
    const screen = await renderPage();
    await expect.element(screen.getByText("Jane Client")).toBeInTheDocument();
  });

  it("renders Add Task button", async () => {
    const screen = await renderPage();
    await expect
      .element(screen.getByRole("button", { name: /new task/i }))
      .toBeInTheDocument();
  });
});
