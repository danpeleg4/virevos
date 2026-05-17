import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

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

  it("renders case names", () => {
    render(
      <CaseList cases={mockCases} clients={mockClients} onSelect={onSelect} />
    );
    expect(screen.getByText("Alpha Case")).toBeInTheDocument();
    expect(screen.getByText("Beta Case")).toBeInTheDocument();
  });

  it("renders status badges", () => {
    render(
      <CaseList cases={mockCases} clients={mockClients} onSelect={onSelect} />
    );
    expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
  });

  it("calls onSelect when a case row is clicked", () => {
    render(
      <CaseList cases={mockCases} clients={mockClients} onSelect={onSelect} />
    );
    fireEvent.click(screen.getByText("Alpha Case"));
    expect(onSelect).toHaveBeenCalledWith(mockCases[0]);
  });

  it("renders 'New Case' button", () => {
    render(
      <CaseList cases={mockCases} clients={mockClients} onSelect={onSelect} />
    );
    expect(
      screen.getByRole("button", { name: /new case/i })
    ).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(
      <CaseList cases={mockCases} clients={mockClients} onSelect={onSelect} />
    );
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});
