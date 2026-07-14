import React from "react";
import { render } from "vitest-browser-react";

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/util/task_percentage", () => ({
  task_percentage: vi.fn(() => 60),
}));

vi.mock("@/lib/workspace/cases", () => ({
  createCase: vi.fn(),
  updateCase: vi.fn(),
  deleteCase: vi.fn(),
}));

const mockCases = [
  {
    id: 1,
    clientId: null,
    name: "Alpha Case",
    status: "active",
    clientName: "Acme",
    dueDate: "2026-06-01",
    stats: { totalTasks: 5, completedTasks: 3, percentage: 60 },
    priority: "high",
  },
  {
    id: 2,
    clientId: null,
    name: "Beta Case",
    status: "completed",
    clientName: "Beta",
    dueDate: "2026-05-01",
    stats: { totalTasks: 4, completedTasks: 4, percentage: 100 },
    priority: "medium",
  },
];

const mockClients = [
  {
    id: 1,
    name: "Acme Corp",
    email: "a@a.com",
    phone: "",
    status: "active",
    activeCases: 1,
    completedCases: 0,
    totalCases: 1,
    avatar: "A",
  },
];

import { CaseList } from "@/app/workspace/cases/CaseList";

describe("CaseList", () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    onSelect.mockClear();
  });

  it("renders case names", async () => {
    const screen = await render(
      <CaseList cases={mockCases} clients={mockClients} onSelect={onSelect} />
    );
    await expect.element(screen.getByText("Alpha Case")).toBeInTheDocument();
    await expect.element(screen.getByText("Beta Case")).toBeInTheDocument();
  });

  it("renders status badges", async () => {
    const screen = await render(
      <CaseList cases={mockCases} clients={mockClients} onSelect={onSelect} />
    );
    await expect
      .element(screen.getByText(/active/i).first())
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/completed/i).first())
      .toBeInTheDocument();
  });

  it("calls onSelect when a case row is clicked", async () => {
    const screen = await render(
      <CaseList cases={mockCases} clients={mockClients} onSelect={onSelect} />
    );
    await screen.getByText("Alpha Case").click();
    expect(onSelect).toHaveBeenCalledWith(mockCases[0]);
  });

  it("renders 'New Case' button", async () => {
    const screen = await render(
      <CaseList cases={mockCases} clients={mockClients} onSelect={onSelect} />
    );
    await expect
      .element(screen.getByRole("button", { name: /new case/i }))
      .toBeInTheDocument();
  });

  it("renders search input", async () => {
    const screen = await render(
      <CaseList cases={mockCases} clients={mockClients} onSelect={onSelect} />
    );
    await expect
      .element(screen.getByPlaceholder(/search/i))
      .toBeInTheDocument();
  });
});
