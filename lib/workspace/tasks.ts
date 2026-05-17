"use server";

import { db } from "@db/db";
import { cases, tasks } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/supabase/auth";
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

export async function deleteTask(taskId: number) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
}

export async function updateTaskStatus(status: string, taskId: number) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");
  const validStatus = requireOneOf(status, "status", TASK_STATUSES);

  // get existing task
  const existing = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!existing) {
    throw new Error("Task not found");
  }

  await db
    .update(tasks)
    .set({ status: validStatus, completed: validStatus === "completed" })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  return { success: true, id: taskId, status: validStatus };
}

export async function changePriorityStatus(taskId: number, priority: string) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");
  const validPriority = requireOneOf(priority, "priority", TASK_PRIORITIES);
  await db
    .update(tasks)
    .set({ priority: validPriority })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
}

export async function updateTaskDueDate(
  taskId: number,
  dueDate: string | null
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");
  await db
    .update(tasks)
    .set({ dueDate: dueDate })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
}

export async function updateTask(input: {
  id: number;
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  dueDate?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  const updateData: Record<string, unknown> = {};
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

  await db
    .update(tasks)
    .set(updateData)
    .where(and(eq(tasks.id, input.id), eq(tasks.userId, user.id)));
}

type AddTaskInput = Partial<Task> & {
  caseName?: string | number | null;
};

async function resolveCaseId(
  userId: string,
  caseName: string | number | null | undefined,
  fallbackCaseId: number | null | undefined
): Promise<number | null> {
  if (
    caseName === undefined ||
    caseName === null ||
    String(caseName).trim() === ""
  ) {
    return fallbackCaseId ?? null;
  }

  const maybeId = Number(caseName);
  if (!Number.isNaN(maybeId)) {
    const byId = await db.select().from(cases).where(eq(cases.id, maybeId));
    if (!byId.length) throw new ValidationError("Case not found");
    if (byId[0].userId !== userId) {
      throw new ValidationError("Unauthorized case", 403);
    }
    return maybeId;
  }

  const byName = await db
    .select()
    .from(cases)
    .where(eq(cases.name, String(caseName)));
  if (!byName.length) throw new ValidationError("Case not found");
  if (byName[0].userId !== userId) {
    throw new ValidationError("Unauthorized case", 403);
  }
  return byName[0].id;
}

export async function addProjectTasksAction(task: AddTaskInput): Promise<Task> {
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

  const caseId = await resolveCaseId(user.id, task.caseName, task.caseId);

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

  const newTask = await db.insert(tasks).values(values).returning();
  return newTask[0];
}
