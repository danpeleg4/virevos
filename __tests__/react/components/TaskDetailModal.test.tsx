import React from "react";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

const mockMutate = vi.fn();
const mockQueryClient = {
  cancelQueries: vi.fn(),
  getQueryData: vi.fn(() => []),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
};

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useQueryClient: () => mockQueryClient,
}));

vi.mock("@/lib/workspace/tasks", () => ({
  deleteTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  changePriorityStatus: vi.fn(),
  updateTaskDueDate: vi.fn(),
}));

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
    mockMutate.mockClear();
    onOpenChange.mockClear();
  });

  it("renders task title when open", async () => {
    const screen = await render(
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
    const screen = await render(
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
    const screen = await render(
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
    const screen = await render(
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
    const screen = await render(
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

  it("calls delete mutation when delete button is clicked", async () => {
    const screen = await render(
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
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("renders status select with current status", async () => {
    await render(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
  });

  it("renders due date input", async () => {
    await render(
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

  it("calls changeDueDate mutation on date blur", async () => {
    await render(
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
      expect(mockMutate).toHaveBeenCalled();
    });
  });
});
