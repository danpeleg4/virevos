import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";

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

import { CaseCreateDialog } from "@/app/workspace/cases/CaseCreateDialog";

describe("CaseCreateDialog", () => {
  it("renders 'New Case' trigger button", async () => {
    const screen = await renderWithQueryClient(
      <CaseCreateDialog clients={mockClients} />
    );
    await expect
      .element(screen.getByRole("button", { name: /new case/i }))
      .toBeInTheDocument();
  });

  it("opens dialog when button is clicked", async () => {
    const screen = await renderWithQueryClient(
      <CaseCreateDialog clients={mockClients} />
    );
    await screen.getByRole("button", { name: /new case/i }).click();
    await expect
      .element(screen.getByText("Create New Case", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders case name input in dialog", async () => {
    const screen = await renderWithQueryClient(
      <CaseCreateDialog clients={mockClients} />
    );
    await screen.getByRole("button", { name: /new case/i }).click();
    await expect
      .element(screen.getByText("Case Name", { exact: true }))
      .toBeInTheDocument();
  });

  it("POSTs the new case on form submit", async () => {
    let postBody: Record<string, unknown> | undefined;
    worker.use(
      http.post("/api/cases", async ({ request }) => {
        postBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ...postBody,
          id: 99,
          stats: { totalTasks: 0, completedTasks: 0, percentage: 0 },
        });
      })
    );

    const screen = await renderWithQueryClient(
      <CaseCreateDialog clients={mockClients} />
    );
    await screen.getByRole("button", { name: /new case/i }).click();
    await screen.getByPlaceholder(/website redesign/i).fill("New Campaign");
    await screen.getByRole("button", { name: /create case/i }).click();

    await vi.waitFor(() =>
      expect(postBody).toEqual(
        expect.objectContaining({ name: "New Campaign", status: "active" })
      )
    );
  });

  it("disables the Create Case button and shows a message when name is empty", async () => {
    const screen = await renderWithQueryClient(
      <CaseCreateDialog clients={mockClients} />
    );
    await screen.getByRole("button", { name: /new case/i }).click();
    await expect
      .element(screen.getByRole("button", { name: /create case/i }))
      .toBeDisabled();
    await expect
      .element(screen.getByText(/case name is required/i))
      .toBeInTheDocument();
  });

  it("enables the Create Case button once a name is entered", async () => {
    const screen = await renderWithQueryClient(
      <CaseCreateDialog clients={mockClients} />
    );
    await screen.getByRole("button", { name: /new case/i }).click();
    await screen.getByPlaceholder(/website redesign/i).fill("New Campaign");
    await expect
      .element(screen.getByRole("button", { name: /create case/i }))
      .toBeEnabled();
    await expect
      .element(screen.getByText(/case name is required/i))
      .not.toBeInTheDocument();
  });

  it("does not POST when name is only whitespace", async () => {
    let postCalled = false;
    worker.use(
      http.post("/api/cases", () => {
        postCalled = true;
        return HttpResponse.json({ id: 99 });
      })
    );

    const screen = await renderWithQueryClient(
      <CaseCreateDialog clients={mockClients} />
    );
    await screen.getByRole("button", { name: /new case/i }).click();
    const nameInput = screen.getByPlaceholder(/website redesign/i);
    await nameInput.fill("New Campaign");
    await nameInput.fill("   ");
    // The disabled button blocks submission; the inline message explains why.
    await expect
      .element(screen.getByRole("button", { name: /create case/i }))
      .toBeDisabled();
    await expect
      .element(screen.getByText(/case name is required/i))
      .toBeInTheDocument();
    await screen
      .getByRole("button", { name: /create case/i })
      .click({ force: true });
    expect(postCalled).toBe(false);
  });

  it("shows a placeholder and opens the calendar date picker on click", async () => {
    const screen = await renderWithQueryClient(
      <CaseCreateDialog clients={mockClients} />
    );
    await screen.getByRole("button", { name: /new case/i }).click();
    await expect
      .element(screen.getByText("Select date", { exact: true }))
      .toBeInTheDocument();

    await screen.getByText("Select date", { exact: true }).click();
    await expect.element(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("includes the selected due date in the POST payload as YYYY-MM-DD", async () => {
    let postBody: Record<string, unknown> | undefined;
    worker.use(
      http.post("/api/cases", async ({ request }) => {
        postBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ...postBody,
          id: 99,
          stats: { totalTasks: 0, completedTasks: 0, percentage: 0 },
        });
      })
    );

    const screen = await renderWithQueryClient(
      <CaseCreateDialog clients={mockClients} />
    );
    await screen.getByRole("button", { name: /new case/i }).click();
    await screen.getByPlaceholder(/website redesign/i).fill("Case with date");

    await screen.getByText("Select date", { exact: true }).click();
    await screen.getByRole("button", { name: /go to the next month/i }).click();
    const days = screen.getByRole("gridcell", { name: "10" });
    await days.first().click();

    await screen.getByRole("button", { name: /create case/i }).click();

    await vi.waitFor(() =>
      expect(postBody?.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    );
  });

  it("resets the selected due date when the dialog is cancelled", async () => {
    const screen = await renderWithQueryClient(
      <CaseCreateDialog clients={mockClients} />
    );
    await screen.getByRole("button", { name: /new case/i }).click();
    await screen.getByText("Select date", { exact: true }).click();
    await screen.getByRole("button", { name: /go to the next month/i }).click();
    const days = screen.getByRole("gridcell", { name: "10" });
    await days.first().click();

    await screen.getByRole("button", { name: /cancel/i }).click();
    await screen.getByRole("button", { name: /new case/i }).click();
    await expect
      .element(screen.getByText("Select date", { exact: true }))
      .toBeInTheDocument();
  });
});
