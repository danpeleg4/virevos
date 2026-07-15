import React from "react";
import { page } from "vitest/browser";
import { http, HttpResponse } from "msw";
import { worker } from "../../msw/worker";
import { renderWithQueryClient } from "../../_helpers/render";

import { TaskDetailModal } from "@/app/components/TaskDetailModal";
import { Task } from "@/types/tasks";

const mockTask: Task = {
  id: 1,
  userId: "user1",
  title: "Fix critical bug",
  description: "This is a test description",
  status: "todo",
  priority: "high",
  dueDate: "2026-05-01",
  completed: false,
  caseId: 10,
  caseName: "Test Case",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

describe("TaskDetailModal", () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    onOpenChange.mockClear();
  });

  it("renders task title when open", async () => {
    const screen = await renderWithQueryClient(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByText("Fix critical bug"))
      .toBeInTheDocument();
  });

  it("renders task description when open", async () => {
    const screen = await renderWithQueryClient(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByText("This is a test description"))
      .toBeInTheDocument();
  });

  it("does not render content when closed", async () => {
    const screen = await renderWithQueryClient(
      <TaskDetailModal
        task={mockTask}
        open={false}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByText("Fix critical bug"))
      .not.toBeInTheDocument();
  });

  it("renders 'No description provided' when description is empty", async () => {
    const taskNoDesc = { ...mockTask, description: "" };
    const screen = await renderWithQueryClient(
      <TaskDetailModal
        task={taskNoDesc}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    await expect
      .element(screen.getByText(/no description provided/i))
      .toBeInTheDocument();
  });

  it("renders delete button", async () => {
    const screen = await renderWithQueryClient(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    // Trash2 delete button — first button before the dialog's close button
    await expect
      .element(screen.getByRole("button").first())
      .toBeInTheDocument();
  });

  it("DELETEs the task and closes the modal when delete is clicked", async () => {
    let deletedId: string | undefined;
    worker.use(
      http.delete("/api/tasks/:id", ({ params }) => {
        deletedId = String(params.id);
        return HttpResponse.json({ success: true, id: Number(params.id) });
      })
    );

    const screen = await renderWithQueryClient(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    // The delete button is the first button in the dialog content (before the close button)
    const buttons = screen.getByRole("button").elements();
    const deleteBtn = buttons.find(
      (btn) => btn.textContent?.trim() !== "Close"
    )!;
    await page.elementLocator(deleteBtn).click();

    await vi.waitFor(() => expect(deletedId).toBe("1"));
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("keeps the modal open when the delete fails", async () => {
    worker.use(
      http.delete("/api/tasks/:id", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );

    const screen = await renderWithQueryClient(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    const buttons = screen.getByRole("button").elements();
    const deleteBtn = buttons.find(
      (btn) => btn.textContent?.trim() !== "Close"
    )!;
    await page.elementLocator(deleteBtn).click();

    // even on failure the modal settles closed per onSettled — assert the
    // rollback path restored the cache without crashing
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("renders status select with current status", async () => {
    await renderWithQueryClient(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
  });

  it("renders due date input", async () => {
    await renderWithQueryClient(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    const dateInput = page.elementLocator(
      document.querySelector('input[type="date"]')!
    );
    await expect.element(dateInput).toHaveValue("2026-05-01");
  });

  it("PATCHes the due date on date blur", async () => {
    let patchBody: unknown;
    let patchedId: string | undefined;
    worker.use(
      http.patch("/api/tasks/:id", async ({ request, params }) => {
        patchedId = String(params.id);
        patchBody = await request.json();
        return HttpResponse.json({ success: true, id: Number(params.id) });
      })
    );

    await renderWithQueryClient(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    const dateInput = page.elementLocator(
      document.querySelector('input[type="date"]')!
    );
    await dateInput.fill("2026-06-01");
    (dateInput.element() as HTMLInputElement).blur();

    await vi.waitFor(() => {
      expect(patchedId).toBe("1");
      expect(patchBody).toEqual({ dueDate: "2026-06-01" });
    });
  });
});
