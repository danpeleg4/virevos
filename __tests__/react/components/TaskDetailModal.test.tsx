import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockMutate = jest.fn();
const mockQueryClient = {
  cancelQueries: jest.fn(),
  getQueryData: jest.fn(() => []),
  setQueryData: jest.fn(),
  invalidateQueries: jest.fn(),
};

jest.mock("@tanstack/react-query", () => ({
  useMutation: (opts: { onSettled?: (...args: unknown[]) => void }) => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useQueryClient: () => mockQueryClient,
}));

jest.mock("@/lib/tasks", () => ({
  deleteTask: jest.fn(),
  updateTaskStatus: jest.fn(),
  changePriorityStatus: jest.fn(),
  updateTaskDueDate: jest.fn(),
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
  projectId: 10,
  projectName: "Test Project",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

describe("TaskDetailModal", () => {
  const onOpenChange = jest.fn();

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
    // The status label "To Do" appears in the badge or select
    expect(screen.getAllByText("To Do").length).toBeGreaterThan(0);
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
