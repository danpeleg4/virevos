import {
  deleteTask,
  updateTaskStatus,
  changePriorityStatus,
  updateTaskDueDate,
  addProjectTasksAction,
  updateTask,
} from "@/lib/workspace/tasks";
import { getCurrentUser } from "@/lib/supabase/auth";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockWhere = vi.fn();
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockFindFirst = vi.fn();

vi.mock("@db/db", () => ({
  db: {
    delete: vi.fn(() => ({ where: mockWhere })),
    update: vi.fn(() => ({ set: mockSet })),
    insert: vi.fn(() => ({ values: mockValues })),
    query: {
      tasks: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}));

const mockUser = { id: "user_1" };

beforeEach(() => {
  vi.clearAllMocks();
  mockWhere.mockResolvedValue(undefined);
  mockSet.mockReturnValue({ where: mockWhere });
});

// ─── deleteTask ────────────────────────────────────────────────────────────

describe("deleteTask", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(deleteTask(1)).rejects.toThrow("No user");
  });

  it("deletes the task for the current user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await deleteTask(42);
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});

// ─── updateTaskStatus ──────────────────────────────────────────────────────

describe("updateTaskStatus", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateTaskStatus("in-progress", 1)).rejects.toThrow("No user");
  });

  it("throws on invalid status", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(updateTaskStatus("invalid", 1)).rejects.toThrow(
      "status must be one of"
    );
  });

  it("throws when task not found", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockFindFirst.mockResolvedValue(undefined);
    await expect(updateTaskStatus("in-progress", 99)).rejects.toThrow(
      "Task not found"
    );
  });

  it("sets completed=true when status is 'completed'", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockFindFirst.mockResolvedValue({ id: 2, userId: "user_1" });

    const result = await updateTaskStatus("completed", 2);

    expect(mockSet).toHaveBeenCalledWith({
      status: "completed",
      completed: true,
    });
    expect(result).toEqual({ success: true, id: 2, status: "completed" });
  });

  it("sets completed=false when status is 'in-progress'", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockFindFirst.mockResolvedValue({ id: 3, userId: "user_1" });

    await updateTaskStatus("in-progress", 3);

    expect(mockSet).toHaveBeenCalledWith({
      status: "in-progress",
      completed: false,
    });
  });
});

// ─── changePriorityStatus ─────────────────────────────────────────────────

describe("changePriorityStatus", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(changePriorityStatus(1, "high")).rejects.toThrow("No user");
  });

  it("updates the priority for the current user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await changePriorityStatus(5, "low");
    expect(mockSet).toHaveBeenCalledWith({ priority: "low" });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});

// ─── updateTaskDueDate ────────────────────────────────────────────────────

describe("updateTaskDueDate", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateTaskDueDate(1, "2026-03-01")).rejects.toThrow("No user");
  });

  it("updates the due date for the current user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateTaskDueDate(7, "2026-03-01");
    expect(mockSet).toHaveBeenCalledWith({ dueDate: "2026-03-01" });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});

// ─── updateTask ───────────────────────────────────────────────────────────

describe("updateTask", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateTask({ id: 1, title: "X" })).rejects.toThrow("No user");
  });

  it("does nothing when no fields provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateTask({ id: 1 });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("updates provided fields with correct where clause", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateTask({ id: 5, title: "New Title", priority: "high" });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New Title", priority: "high" })
    );
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });

  it("sets completed=true when status is 'completed'", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateTask({ id: 5, status: "completed" });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed", completed: true })
    );
  });

  it("sets completed=false when status is not 'completed'", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateTask({ id: 5, status: "in-progress" });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "in-progress", completed: false })
    );
  });

  it("updates dueDate to null", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateTask({ id: 5, dueDate: null });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: null })
    );
  });
});

// ─── addProjectTasksAction ────────────────────────────────────────────────

describe("addProjectTasksAction", () => {
  const baseTask = {
    id: 0,
    userId: "",
    title: "  New Task  ",
    description: "A description",
    priority: "medium",
    status: "in-progress",
    dueDate: "2026-04-01",
    completed: false,
    createdAt: null,
    updatedAt: null,
  };

  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(addProjectTasksAction(baseTask)).rejects.toThrow("No user");
  });

  it("inserts task and returns the created record", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const created = {
      ...baseTask,
      id: 10,
      title: "New Task",
      userId: "user_1",
    };
    mockReturning.mockResolvedValue([created]);

    const result = await addProjectTasksAction(baseTask);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Task",
        userId: "user_1",
        status: "in-progress",
        completed: false,
      })
    );
    expect(result).toEqual(created);
  });

  it("trims whitespace from title", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockReturning.mockResolvedValue([{ ...baseTask, title: "New Task" }]);

    await addProjectTasksAction({ ...baseTask, title: "   New Task   " });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New Task" })
    );
  });

  it("omits caseId from insert when not provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockReturning.mockResolvedValue([{ ...baseTask, title: "New Task" }]);

    await addProjectTasksAction({ ...baseTask, caseId: null });

    expect(mockValues).toHaveBeenCalledWith(
      expect.not.objectContaining({ caseId: expect.anything() })
    );
  });

  it("includes caseId in insert when provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockReturning.mockResolvedValue([
      { ...baseTask, title: "New Task", caseId: 5 },
    ]);

    await addProjectTasksAction({ ...baseTask, caseId: 5 });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: 5 })
    );
  });

  it("falls back to current ISO timestamp when dueDate not provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockReturning.mockResolvedValue([{ ...baseTask, title: "New Task" }]);

    await addProjectTasksAction({ ...baseTask, dueDate: null });

    const firstCall = mockValues.mock.calls[0] as unknown as [
      { dueDate: string },
    ];
    expect(firstCall[0].dueDate).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
  });
});
