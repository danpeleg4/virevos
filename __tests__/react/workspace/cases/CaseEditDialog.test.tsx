import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/cases", () => ({
  updateCase: vi.fn(),
}));

const mockCase = {
  id: 1,
  name: "Existing Case",
  status: "active",
  priority: "medium",
  clientId: 1,
  dueDate: "2026-06-01",
  stats: { totalTasks: 3, completedTasks: 1, percentage: 33 },
};

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

import { CaseEditDialog } from "@/app/workspace/cases/CaseEditDialog";

describe("CaseEditDialog", () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    mockMutate.mockClear();
    onOpenChange.mockClear();
  });

  it("renders dialog when open=true", () => {
    render(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getByText("Edit Case")).toBeInTheDocument();
  });

  it("does not render content when open=false", () => {
    render(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={false}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.queryByText("Edit Case")).not.toBeInTheDocument();
  });

  it("pre-fills the case name", () => {
    render(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getByDisplayValue("Existing Case")).toBeInTheDocument();
  });

  it("renders Save Changes button", () => {
    render(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).toBeInTheDocument();
  });

  it("calls mutation on save", () => {
    render(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});
