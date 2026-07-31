import { getCurrentUser } from "@/lib/supabase/auth";
import type { TasksDB, TaskUpdateData } from "@db/tasks_db";
import { Task } from "@/types/tasks";
import {
  MAX_NOTES,
  MAX_TITLE,
  ValidationError,
  optionalString,
  requireOneOf,
  requireString,
} from "../util/validation";

const TASK_PRIORITIES = ["low", "medium", "high"] as const;
const TASK_STATUSES = ["in-progress", "completed"] as const;

export async function getAllTasks(tasksDb: TasksDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  return tasksDb.getAllTasksWithCaseName(user.id);
}

export async function getTasksByCase(caseId: number, tasksDb: TasksDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  return tasksDb.getTasksByCase(user.id, caseId);
}

export async function deleteTask(taskId: number, tasksDb: TasksDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");
  await tasksDb.deleteTask(taskId, user.id);
}

export async function updateTaskStatus(
  status: string,
  taskId: number,
  tasksDb: TasksDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");
  const validStatus = requireOneOf(status, "status", TASK_STATUSES);

  // get existing task
  const existing = await tasksDb.findTaskById(taskId, user.id);

  if (!existing) {
    throw new Error("Task not found");
  }

  await tasksDb.updateTask(taskId, user.id, {
    status: validStatus,
    completed: validStatus === "completed",
  });

  return { success: true, id: taskId, status: validStatus };
}

export async function changePriorityStatus(
  taskId: number,
  priority: string,
  tasksDb: TasksDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");
  const validPriority = requireOneOf(priority, "priority", TASK_PRIORITIES);
  await tasksDb.updateTask(taskId, user.id, { priority: validPriority });
}

export async function updateTaskDueDate(
  taskId: number,
  dueDate: string | null,
  tasksDb: TasksDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");
  await tasksDb.updateTask(taskId, user.id, { dueDate: dueDate });
}

export async function updateTask(
  input: {
    id?: number;
    taskTitle?: string;
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    dueDate?: string | null;
  },
  tasksDb: TasksDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  const updateData: TaskUpdateData = {};
  if (input.title !== undefined) {
    updateData.title = requireString(input.title, "title", MAX_TITLE);
  }
  if (input.description !== undefined) {
    updateData.description = optionalString(
      input.description,
      "description",
      MAX_NOTES
    );
  }
  if (input.priority !== undefined) {
    updateData.priority = requireOneOf(
      input.priority,
      "priority",
      TASK_PRIORITIES
    );
  }
  if (input.status !== undefined) {
    const validStatus = requireOneOf(input.status, "status", TASK_STATUSES);
    updateData.status = validStatus;
    updateData.completed = validStatus === "completed";
  }
  if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;

  if (Object.keys(updateData).length === 0) return;

  let targetId = input.id;
  if (!targetId) {
    if (!input.taskTitle) {
      throw new ValidationError("id or taskTitle is required", 400);
    }
    const validTaskTitle = requireString(input.taskTitle, "taskTitle", MAX_TITLE);
    const matches = await tasksDb.getTaskByTitle(user.id, validTaskTitle);
    if (matches.length === 0) {
      throw new ValidationError("No task found", 400);
    }
    targetId = matches[0].id;
  }

  await tasksDb.updateTask(targetId, user.id, updateData);
}

type AddTaskInput = Partial<Task> & {
  caseName?: string | number | null;
};

async function resolveCaseId(
  userId: string,
  caseName: string | number | null | undefined,
  fallbackCaseId: number | null | undefined,
  tasksDb: TasksDB
): Promise<number | null> {
  if (fallbackCaseId) {
    const caseById = await tasksDb.getCaseById(fallbackCaseId);
    if (!caseById.length) throw new ValidationError("Case not found");
    if (caseById[0].userId !== userId) {
      throw new ValidationError("Unauthorized case", 403);
    }
  }
  if (
    caseName === undefined ||
    caseName === null ||
    String(caseName).trim() === ""
  ) {
    return fallbackCaseId ?? null;
  }

  const maybeId = Number(caseName);
  if (!Number.isNaN(maybeId)) {
    const byId = await tasksDb.getCaseById(maybeId);
    if (!byId.length) throw new ValidationError("Case not found");
    if (byId[0].userId !== userId) {
      throw new ValidationError("Unauthorized case", 403);
    }
    return maybeId;
  }

  const byName = await tasksDb.getCaseByName(String(caseName));
  if (!byName.length) throw new ValidationError("Case not found");
  if (byName[0].userId !== userId) {
    throw new ValidationError("Unauthorized case", 403);
  }
  return byName[0].id;
}

export async function addProjectTasksAction(
  task: AddTaskInput,
  tasksDb: TasksDB
): Promise<Task> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  const title = requireString(task.title, "title", MAX_TITLE);
  const description = optionalString(
    task.description,
    "description",
    MAX_NOTES
  );
  const priority = task.priority
    ? requireOneOf(task.priority, "priority", TASK_PRIORITIES)
    : undefined;

  const caseId = await resolveCaseId(
    user.id,
    task.caseName,
    task.caseId,
    tasksDb
  );

  const dueDate =
    task.dueDate && String(task.dueDate).trim() !== ""
      ? task.dueDate
      : new Date().toISOString();

  const values = {
    title,
    description,
    priority,
    ...(caseId != null ? { caseId } : {}),
    userId: user.id,
    status: "in-progress" as const,
    completed: false,
    dueDate,
  };

  return tasksDb.insertTask(values);
}
