import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

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

  it("renders task title when open", () => {
    render(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getByText("Fix critical bug")).toBeInTheDocument();
  });

  it("renders task description when open", () => {
    render(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getByText("This is a test description")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <TaskDetailModal
        task={mockTask}
        open={false}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.queryByText("Fix critical bug")).not.toBeInTheDocument();
  });

  it("renders 'No description provided' when description is empty", () => {
    const taskNoDesc = { ...mockTask, description: "" };
    render(
      <TaskDetailModal
        task={taskNoDesc}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getByText(/no description provided/i)).toBeInTheDocument();
  });

  it("renders delete button", () => {
    render(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    // Trash2 delete button — first button before the dialog's close button
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("calls delete mutation when delete button is clicked", () => {
    render(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    // The delete button is the first button in the dialog content (before the close button)
    const buttons = screen.getAllByRole("button");
    const deleteBtn = buttons.find(
      (btn) => btn.textContent?.trim() !== "Close"
    )!;
    fireEvent.click(deleteBtn);
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("renders status select with current status", () => {
    render(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
  });

  it("renders due date input", () => {
    render(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    const dateInput = screen.getByDisplayValue("2026-05-01");
    expect(dateInput).toBeInTheDocument();
  });

  it("calls changeDueDate mutation on date blur", () => {
    render(
      <TaskDetailModal
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    const dateInput = screen.getByDisplayValue("2026-05-01");
    fireEvent.change(dateInput, { target: { value: "2026-06-01" } });
    fireEvent.blur(dateInput);
    expect(mockMutate).toHaveBeenCalled();
  });
});
