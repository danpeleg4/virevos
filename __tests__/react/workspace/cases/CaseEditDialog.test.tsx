import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";

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
    onOpenChange.mockClear();
  });

  it("renders dialog when open=true", async () => {
    const screen = await renderWithQueryClient(
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
    const screen = await renderWithQueryClient(
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
    await renderWithQueryClient(
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
    const screen = await renderWithQueryClient(
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

  it("PATCHes the case on save and closes the dialog", async () => {
    let patchedId: string | undefined;
    let patchBody: unknown;
    worker.use(
      http.patch("/api/cases/:id", async ({ request, params }) => {
        patchedId = String(params.id);
        patchBody = await request.json();
        return HttpResponse.json({ success: true, id: Number(params.id) });
      })
    );

    const screen = await renderWithQueryClient(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await screen.getByRole("button", { name: /save changes/i }).click();

    await vi.waitFor(() => {
      expect(patchedId).toBe("1");
      expect(patchBody).toEqual(
        expect.objectContaining({ name: "Existing Case", status: "active" })
      );
    });
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("keeps the dialog open when the save fails", async () => {
    worker.use(
      http.patch("/api/cases/:id", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );

    const screen = await renderWithQueryClient(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await screen.getByRole("button", { name: /save changes/i }).click();

    // the failed mutation must not close the dialog
    await expect
      .element(screen.getByText("Edit Case", { exact: true }))
      .toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("pre-fills the calendar trigger with the case's existing due date", async () => {
    const screen = await renderWithQueryClient(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByText("Select date", { exact: true }))
      .not.toBeInTheDocument();
  });

  it("opens the calendar date picker when the trigger is clicked", async () => {
    const caseWithoutDueDate = { ...mockCase, dueDate: null };
    const screen = await renderWithQueryClient(
      <CaseEditDialog
        aCase={caseWithoutDueDate}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByText("Select date", { exact: true }))
      .toBeInTheDocument();

    await screen.getByText("Select date", { exact: true }).click();
    await expect.element(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("PATCHes a newly selected due date as YYYY-MM-DD", async () => {
    let patchBody: Record<string, unknown> | undefined;
    worker.use(
      http.patch("/api/cases/:id", async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ success: true, id: 1 });
      })
    );

    const screen = await renderWithQueryClient(
      <CaseEditDialog
        aCase={mockCase}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    await screen.getByText(/6\/1\/2026/).click();
    await screen.getByRole("button", { name: /go to the next month/i }).click();
    const days = screen.getByRole("gridcell", { name: "10" });
    await days.first().click();

    await screen.getByRole("button", { name: /save changes/i }).click();

    await vi.waitFor(() =>
      expect(patchBody?.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    );
  });
});
