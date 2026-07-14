import React from "react";
import { render } from "vitest-browser-react";

const mockMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/workspace/cases", () => ({
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

  it("renders dialog when open=true", async () => {
    const screen = await render(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByText("Edit Case", { exact: true }))
      .toBeInTheDocument();
  });

  it("does not render content when open=false", async () => {
    const screen = await render(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={false}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByText("Edit Case", { exact: true }))
      .not.toBeInTheDocument();
  });

  it("pre-fills the case name", async () => {
    await render(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    // no getByDisplayValue locator; assert an input carries the value
    await vi.waitFor(() => {
      const hasValue = Array.from(document.querySelectorAll("input")).some(
        (input) => input.value === "Existing Case"
      );
      expect(hasValue).toBe(true);
    });
  });

  it("renders Save Changes button", async () => {
    const screen = await render(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByRole("button", { name: /save changes/i }))
      .toBeInTheDocument();
  });

  it("calls mutation on save", async () => {
    const screen = await render(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await screen.getByRole("button", { name: /save changes/i }).click();
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});
