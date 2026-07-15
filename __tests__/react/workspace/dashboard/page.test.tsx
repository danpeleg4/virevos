import React from "react";
import { renderWithQueryClient } from "../../../_helpers/render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

import Dashboard from "@/app/workspace/dashboard/page";

// Default MSW fixtures serve 2 clients (clients.ts), "Estate Case" /
// "Contract Review" (cases.ts), and "Design UI mockups" / "Review contract"
// (tasks.ts).

describe("Dashboard Page", () => {
  it("renders Dashboard heading", async () => {
    const screen = await renderWithQueryClient(<Dashboard />);
    await expect
      .element(screen.getByText("Dashboard", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders stat cards", async () => {
    const screen = await renderWithQueryClient(<Dashboard />);
    await expect
      .element(screen.getByText("Active Clients"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Active Cases")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Tasks Completed"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Automations Run"))
      .toBeInTheDocument();
  });

  it("renders Recent Cases section", async () => {
    const screen = await renderWithQueryClient(<Dashboard />);
    await expect.element(screen.getByText("Recent Cases")).toBeInTheDocument();
  });

  it("renders Upcoming Tasks section", async () => {
    const screen = await renderWithQueryClient(<Dashboard />);
    await expect
      .element(screen.getByText("Upcoming Tasks"))
      .toBeInTheDocument();
  });

  it("renders cases from the /api/cases/get-cases query", async () => {
    const screen = await renderWithQueryClient(<Dashboard />);
    await expect
      .element(screen.getByText("Estate Case").first())
      .toBeInTheDocument();
  });

  it("renders tasks from the /api/tasks query", async () => {
    const screen = await renderWithQueryClient(<Dashboard />);
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();
  });

  it("shows the client count from the /api/clients query", async () => {
    const screen = await renderWithQueryClient(<Dashboard />);
    // 2 clients in the default MSW fixture - may appear in multiple stat cards
    await expect
      .element(screen.getByText("2", { exact: true }).first())
      .toBeInTheDocument();
  });
});
