import {
  deleteTask,
  updateTaskStatus,
  changePriorityStatus,
  updateTaskDueDate,
  addProjectTasksAction,
  updateTask,
  getAllTasks,
  getTasksByCase,
} from "@/lib/workspace/tasks";
import { getCurrentUser } from "@/lib/supabase/auth";
import { canonicalTaskRow, makeFakeTasksDb } from "../fakes/fake_tasks_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const tasksDb = makeFakeTasksDb();

const mockUser = { id: "user_1" };

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getAllTasks ───────────────────────────────────────────────────────────

describe("getAllTasks", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getAllTasks(tasksDb)).rejects.toThrow("Unauthorized");
    expect(tasksDb.getAllTasksWithCaseName).not.toHaveBeenCalled();
  });

  it("returns the current user's tasks with case names", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(getAllTasks(tasksDb)).resolves.toEqual([
      { tasks: canonicalTaskRow, caseName: null },
    ]);
    expect(tasksDb.getAllTasksWithCaseName).toHaveBeenCalledWith("user_1");
  });
});

// ─── getTasksByCase ────────────────────────────────────────────────────────

describe("getTasksByCase", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getTasksByCase(5, tasksDb)).rejects.toThrow("Unauthorized");
  });

  it("returns the tasks scoped to the case and user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(getTasksByCase(5, tasksDb)).resolves.toEqual([
      { ...canonicalTaskRow, caseId: 5 },
    ]);
    expect(tasksDb.getTasksByCase).toHaveBeenCalledWith("user_1", 5);
  });
});

// ─── deleteTask ────────────────────────────────────────────────────────────

describe("deleteTask", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(deleteTask(1, tasksDb)).rejects.toThrow("No user");
  });

  it("deletes the task for the current user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await deleteTask(42, tasksDb);
    expect(tasksDb.deleteTask).toHaveBeenCalledWith(42, "user_1");
  });
});

// ─── updateTaskStatus ──────────────────────────────────────────────────────

describe("updateTaskStatus", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateTaskStatus("in-progress", 1, tasksDb)).rejects.toThrow(
      "No user"
    );
  });

  it("throws on invalid status", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(updateTaskStatus("invalid", 1, tasksDb)).rejects.toThrow(
      "status must be one of"
    );
  });

  it("throws when task not found", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    tasksDb.findTaskById.mockResolvedValueOnce(undefined);
    await expect(updateTaskStatus("in-progress", 99, tasksDb)).rejects.toThrow(
      "Task not found"
    );
    expect(tasksDb.updateTask).not.toHaveBeenCalled();
  });

  it("sets completed=true when status is 'completed'", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    const result = await updateTaskStatus("completed", 2, tasksDb);

    expect(tasksDb.updateTask).toHaveBeenCalledWith(2, "user_1", {
      status: "completed",
      completed: true,
    });
    expect(result).toEqual({ success: true, id: 2, status: "completed" });
  });

  it("sets completed=false when status is 'in-progress'", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await updateTaskStatus("in-progress", 3, tasksDb);

    expect(tasksDb.updateTask).toHaveBeenCalledWith(3, "user_1", {
      status: "in-progress",
      completed: false,
    });
  });
});

// ─── changePriorityStatus ─────────────────────────────────────────────────

describe("changePriorityStatus", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(changePriorityStatus(1, "high", tasksDb)).rejects.toThrow(
      "No user"
    );
  });

  it("updates the priority for the current user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await changePriorityStatus(5, "low", tasksDb);
    expect(tasksDb.updateTask).toHaveBeenCalledWith(5, "user_1", {
      priority: "low",
    });
  });
});

// ─── updateTaskDueDate ────────────────────────────────────────────────────

describe("updateTaskDueDate", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateTaskDueDate(1, "2026-03-01", tasksDb)).rejects.toThrow(
      "No user"
    );
  });

  it("updates the due date for the current user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateTaskDueDate(7, "2026-03-01", tasksDb);
    expect(tasksDb.updateTask).toHaveBeenCalledWith(7, "user_1", {
      dueDate: "2026-03-01",
    });
  });
});

// ─── updateTask ───────────────────────────────────────────────────────────

describe("updateTask", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateTask({ id: 1, title: "X" }, tasksDb)).rejects.toThrow(
      "No user"
    );
  });

  it("does nothing when no fields provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateTask({ id: 1 }, tasksDb);
    expect(tasksDb.updateTask).not.toHaveBeenCalled();
  });

  it("updates provided fields with correct where clause", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateTask({ id: 5, title: "New Title", priority: "high" }, tasksDb);
    expect(tasksDb.updateTask).toHaveBeenCalledWith(
      5,
      "user_1",
      expect.objectContaining({ title: "New Title", priority: "high" })
    );
  });

  it("sets completed=true when status is 'completed'", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateTask({ id: 5, status: "completed" }, tasksDb);
    expect(tasksDb.updateTask).toHaveBeenCalledWith(
      5,
      "user_1",
      expect.objectContaining({ status: "completed", completed: true })
    );
  });

  it("sets completed=false when status is not 'completed'", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateTask({ id: 5, status: "in-progress" }, tasksDb);
    expect(tasksDb.updateTask).toHaveBeenCalledWith(
      5,
      "user_1",
      expect.objectContaining({ status: "in-progress", completed: false })
    );
  });

  it("updates dueDate to null", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateTask({ id: 5, dueDate: null }, tasksDb);
    expect(tasksDb.updateTask).toHaveBeenCalledWith(
      5,
      "user_1",
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
    await expect(addProjectTasksAction(baseTask, tasksDb)).rejects.toThrow(
      "No user"
    );
  });

  it("inserts task and returns the created record", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    const result = await addProjectTasksAction(baseTask, tasksDb);

    expect(tasksDb.insertTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Task",
        userId: "user_1",
        status: "in-progress",
        completed: false,
      })
    );
    expect(result).toEqual(
      expect.objectContaining({ id: 10, title: "New Task", userId: "user_1" })
    );
  });

  it("trims whitespace from title", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await addProjectTasksAction(
      { ...baseTask, title: "   New Task   " },
      tasksDb
    );

    expect(tasksDb.insertTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New Task" })
    );
  });

  it("omits caseId from insert when not provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await addProjectTasksAction({ ...baseTask, caseId: null }, tasksDb);

    expect(tasksDb.insertTask).toHaveBeenCalledWith(
      expect.not.objectContaining({ caseId: expect.anything() })
    );
  });

  it("includes caseId in insert when provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await addProjectTasksAction({ ...baseTask, caseId: 5 }, tasksDb);

    expect(tasksDb.getCaseById).toHaveBeenCalledWith(5);
    expect(tasksDb.insertTask).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: 5 })
    );
  });

  it("rejects a directly supplied caseId owned by another user with 403 (#269)", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    tasksDb.getCaseById.mockResolvedValueOnce([{ id: 5, userId: "user_2" }]);

    await expect(
      addProjectTasksAction({ ...baseTask, caseId: 5 }, tasksDb)
    ).rejects.toMatchObject({ message: "Unauthorized case", status: 403 });
    expect(tasksDb.insertTask).not.toHaveBeenCalled();
  });

  it("throws 'Case not found' when a directly supplied caseId does not exist", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    tasksDb.getCaseById.mockResolvedValueOnce([]);

    await expect(
      addProjectTasksAction({ ...baseTask, caseId: 999 }, tasksDb)
    ).rejects.toThrow("Case not found");
    expect(tasksDb.insertTask).not.toHaveBeenCalled();
  });

  it("falls back to current ISO timestamp when dueDate not provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await addProjectTasksAction({ ...baseTask, dueDate: null }, tasksDb);

    const firstCall = tasksDb.insertTask.mock.calls[0] as unknown as [
      { dueDate: string },
    ];
    expect(firstCall[0].dueDate).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
  });

  it("resolves a numeric caseName after verifying ownership", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await addProjectTasksAction({ ...baseTask, caseName: "7" }, tasksDb);

    expect(tasksDb.getCaseById).toHaveBeenCalledWith(7);
    expect(tasksDb.insertTask).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: 7 })
    );
  });

  it("resolves a caseName string to the owning case id", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    tasksDb.getCaseByName.mockResolvedValueOnce([{ id: 5, userId: "user_1" }]);

    await addProjectTasksAction(
      { ...baseTask, caseName: "Estate Case" },
      tasksDb
    );

    expect(tasksDb.getCaseByName).toHaveBeenCalledWith("Estate Case");
    expect(tasksDb.insertTask).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: 5 })
    );
  });

  it("rejects a caseName that does not exist", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    tasksDb.getCaseByName.mockResolvedValueOnce([]);

    await expect(
      addProjectTasksAction({ ...baseTask, caseName: "Ghost Case" }, tasksDb)
    ).rejects.toThrow("Case not found");
    expect(tasksDb.insertTask).not.toHaveBeenCalled();
  });

  it("rejects a case owned by another user with 403", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    tasksDb.getCaseById.mockResolvedValueOnce([{ id: 7, userId: "user_2" }]);

    await expect(
      addProjectTasksAction({ ...baseTask, caseName: "7" }, tasksDb)
    ).rejects.toMatchObject({ message: "Unauthorized case", status: 403 });
    expect(tasksDb.insertTask).not.toHaveBeenCalled();
  });
});
