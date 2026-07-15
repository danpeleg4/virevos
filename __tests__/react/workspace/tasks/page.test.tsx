import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";

import Tasks from "@/app/workspace/tasks/page";

// default MSW fixtures serve two tasks:
// "Design UI mockups" (in-progress, medium) and "Review contract" (completed, high)

describe("Tasks Page", () => {
  it("renders tasks table with task titles", async () => {
    const screen = await renderWithQueryClient(<Tasks />);
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Review contract"))
      .toBeInTheDocument();
  });

  it("renders search input", async () => {
    const screen = await renderWithQueryClient(<Tasks />);
    await expect
      .element(screen.getByPlaceholder(/search tasks/i))
      .toBeInTheDocument();
  });

  it("renders status filter tabs", async () => {
    const screen = await renderWithQueryClient(<Tasks />);
    await expect
      .element(screen.getByRole("button", { name: /all/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /in progress/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /completed/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /to do/i }))
      .not.toBeInTheDocument();
  });

  it("renders 'New Task' button", async () => {
    const screen = await renderWithQueryClient(<Tasks />);
    await expect
      .element(screen.getByRole("button", { name: /new task/i }))
      .toBeInTheDocument();
  });

  it("filters tasks by search query", async () => {
    const screen = await renderWithQueryClient(<Tasks />);
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();
    await screen.getByPlaceholder(/search tasks/i).fill("design");
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Review contract"))
      .not.toBeInTheDocument();
  });

  it("filters by status tab - 'In Progress' shows only in-progress tasks", async () => {
    const screen = await renderWithQueryClient(<Tasks />);
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();
    await screen.getByRole("button", { name: /in progress/i }).click();
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Review contract"))
      .not.toBeInTheDocument();
  });

  it("renders priority badges", async () => {
    const screen = await renderWithQueryClient(<Tasks />);
    await expect
      .element(screen.getByText("high", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("medium", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders pagination controls", async () => {
    const screen = await renderWithQueryClient(<Tasks />);
    await expect
      .element(screen.getByRole("button", { name: /previous/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /next/i }))
      .toBeInTheDocument();
  });

  it("shows 'No tasks found' when no tasks match filter", async () => {
    const screen = await renderWithQueryClient(<Tasks />);
    await screen.getByPlaceholder(/search tasks/i).fill("xyznonexistent");
    await expect
      .element(screen.getByText(/no tasks found/i))
      .toBeInTheDocument();
  });

  it("shows an empty table when the API returns an error", async () => {
    worker.use(
      http.get("/api/tasks", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );

    const screen = await renderWithQueryClient(<Tasks />);
    await expect
      .element(screen.getByText(/no tasks found/i))
      .toBeInTheDocument();
  });

  it("PATCHes the task status when the checkbox is toggled", async () => {
    let patchedId: string | undefined;
    let patchBody: unknown;
    worker.use(
      http.patch("/api/tasks/:id", async ({ request, params }) => {
        patchedId = String(params.id);
        patchBody = await request.json();
        return HttpResponse.json({ success: true, id: Number(params.id) });
      })
    );

    const screen = await renderWithQueryClient(<Tasks />);
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();

    // dueDate-asc sort puts "Review contract" (id 2, completed) first
    await screen.getByRole("checkbox").first().click();

    await vi.waitFor(() => {
      expect(patchedId).toBe("2");
      expect(patchBody).toEqual({ status: "in-progress" });
    });
  });
});
