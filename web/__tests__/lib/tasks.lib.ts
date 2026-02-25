import {
  deleteTask,
  updateTaskStatus,
  changePriorityStatus,
  updateTaskDueDate,
  addProjectTasksAction,
} from "@/lib/server_actions/tasks";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

const mockWhere = jest.fn();
const mockSet = jest.fn(() => ({ where: mockWhere }));
const mockReturning = jest.fn();
const mockValues = jest.fn(() => ({ returning: mockReturning }));
const mockFindFirst = jest.fn();

jest.mock("@db/db", () => ({
  db: {
    delete: jest.fn(() => ({ where: mockWhere })),
    update: jest.fn(() => ({ set: mockSet })),
    insert: jest.fn(() => ({ values: mockValues })),
    query: {
      tasks: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}));

const mockUser = { id: "user_1" };

beforeEach(() => {
  jest.clearAllMocks();
  mockWhere.mockResolvedValue(undefined);
  mockSet.mockReturnValue({ where: mockWhere });
});

// ─── deleteTask ────────────────────────────────────────────────────────────

describe("deleteTask", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(deleteTask(1)).rejects.toThrow("No user");
  });

  it("deletes the task for the current user", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await deleteTask(42);
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});

// ─── updateTaskStatus ──────────────────────────────────────────────────────

describe("updateTaskStatus", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(updateTaskStatus("todo", 1)).rejects.toThrow("No user");
  });

  it("throws on invalid status", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await expect(updateTaskStatus("invalid", 1)).rejects.toThrow(
      "Invalid status"
    );
  });

  it("throws when task not found", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockFindFirst.mockResolvedValue(undefined);
    await expect(updateTaskStatus("todo", 99)).rejects.toThrow("Task not found");
  });

  it("updates status and returns success for todo", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockFindFirst.mockResolvedValue({ id: 1, userId: "user_1" });

    const result = await updateTaskStatus("todo", 1);

    expect(mockSet).toHaveBeenCalledWith({ status: "todo", completed: false });
    expect(result).toEqual({ success: true, id: 1, status: "todo" });
  });

  it("sets completed=true when status is 'completed'", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockFindFirst.mockResolvedValue({ id: 2, userId: "user_1" });

    const result = await updateTaskStatus("completed", 2);

    expect(mockSet).toHaveBeenCalledWith({
      status: "completed",
      completed: true,
    });
    expect(result).toEqual({ success: true, id: 2, status: "completed" });
  });

  it("sets completed=false when status is 'in-progress'", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
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
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(changePriorityStatus(1, "high")).rejects.toThrow("No user");
  });

  it("updates the priority for the current user", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await changePriorityStatus(5, "low");
    expect(mockSet).toHaveBeenCalledWith({ priority: "low" });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });
});

// ─── updateTaskDueDate ────────────────────────────────────────────────────

describe("updateTaskDueDate", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(updateTaskDueDate(1, "2026-03-01")).rejects.toThrow("No user");
  });

  it("updates the due date for the current user", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await updateTaskDueDate(7, "2026-03-01");
    expect(mockSet).toHaveBeenCalledWith({ dueDate: "2026-03-01" });
    expect(mockWhere).toHaveBeenCalledTimes(1);
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
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(addProjectTasksAction(baseTask)).rejects.toThrow("No user");
  });

  it("inserts task and returns the created record", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const created = { ...baseTask, id: 10, title: "New Task", userId: "user_1" };
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
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockReturning.mockResolvedValue([{ ...baseTask, title: "New Task" }]);

    await addProjectTasksAction({ ...baseTask, title: "   New Task   " });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New Task" })
    );
  });

  it("omits projectId from insert when not provided", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockReturning.mockResolvedValue([{ ...baseTask, title: "New Task" }]);

    await addProjectTasksAction({ ...baseTask, projectId: null });

    expect(mockValues).toHaveBeenCalledWith(
      expect.not.objectContaining({ projectId: expect.anything() })
    );
  });

  it("includes projectId in insert when provided", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockReturning.mockResolvedValue([{ ...baseTask, title: "New Task", projectId: 5 }]);

    await addProjectTasksAction({ ...baseTask, projectId: 5 });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 5 })
    );
  });

  it("sets dueDate to null when not provided", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockReturning.mockResolvedValue([{ ...baseTask, title: "New Task", dueDate: null }]);

    await addProjectTasksAction({ ...baseTask, dueDate: null });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: null })
    );
  });
});
