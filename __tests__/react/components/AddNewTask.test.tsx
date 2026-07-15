import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../msw/worker";
import { renderWithQueryClient } from "../../_helpers/render";

import AddNewTask from "@/app/components/AddNewTask";

describe("AddNewTask", () => {
  it("renders 'New Task' button", async () => {
    const screen = await renderWithQueryClient(<AddNewTask />);
    await expect
      .element(screen.getByRole("button", { name: /new task/i }))
      .toBeInTheDocument();
  });

  it("opens dialog when 'New Task' is clicked", async () => {
    const screen = await renderWithQueryClient(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await expect
      .element(screen.getByText("Create New Task", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders title input inside dialog", async () => {
    const screen = await renderWithQueryClient(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await expect
      .element(screen.getByPlaceholder(/review designs/i))
      .toBeInTheDocument();
  });

  it("renders description textarea inside dialog", async () => {
    const screen = await renderWithQueryClient(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await expect
      .element(screen.getByPlaceholder(/add more details/i))
      .toBeInTheDocument();
  });

  it("shows case select when no caseId prop", async () => {
    const screen = await renderWithQueryClient(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await expect
      .element(screen.getByText(/select a case/i))
      .toBeInTheDocument();
  });

  it("hides case select when caseId prop is provided", async () => {
    const screen = await renderWithQueryClient(<AddNewTask caseId={5} />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await expect
      .element(screen.getByText(/select a case/i))
      .not.toBeInTheDocument();
  });

  it("'Create Task' button is disabled when title is empty", async () => {
    const screen = await renderWithQueryClient(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await expect
      .element(screen.getByRole("button", { name: /create task/i }))
      .toBeDisabled();
  });

  it("enables 'Create Task' when title is filled", async () => {
    const screen = await renderWithQueryClient(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await screen.getByPlaceholder(/review designs/i).fill("My task");
    await expect
      .element(screen.getByRole("button", { name: /create task/i }))
      .not.toBeDisabled();
  });

  it("POSTs the new task and closes the dialog on submit", async () => {
    let postBody: Record<string, unknown> | undefined;
    worker.use(
      http.post("/api/tasks", async ({ request }) => {
        postBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...postBody, id: 99 });
      })
    );

    const screen = await renderWithQueryClient(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await screen.getByPlaceholder(/review designs/i).fill("Test Task");
    await screen.getByRole("button", { name: /create task/i }).click();

    await vi.waitFor(() =>
      expect(postBody).toEqual(
        expect.objectContaining({ title: "Test Task", status: "in-progress" })
      )
    );
    await expect
      .element(screen.getByText("Create New Task", { exact: true }))
      .not.toBeInTheDocument();
  });

  it("closes dialog and resets form when Cancel is clicked", async () => {
    const screen = await renderWithQueryClient(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await screen.getByPlaceholder(/review designs/i).fill("something");
    await screen.getByRole("button", { name: /cancel/i }).click();
    await expect
      .element(screen.getByText("Create New Task", { exact: true }))
      .not.toBeInTheDocument();
  });
});
