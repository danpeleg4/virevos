"use server";

import { db } from "@db/db";
import { tasks } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { Task } from "@/types/tasks";

export async function deleteTask(taskId: number) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
}

export async function updateTaskStatus(status: string, taskId: number) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");
  if (!["todo", "in-progress", "completed"].includes(status)) {
    throw new Error("Invalid status");
  }

  // get existing task
  const existing = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!existing) {
    throw new Error("Task not found");
  }

  await db
    .update(tasks)
    .set({ status, completed: status === "completed" })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  return { success: true, id: taskId, status };
}

export async function changePriorityStatus(taskId: number, priority: string) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");
  await db
    .update(tasks)
    .set({ priority: priority })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
}

export async function updateTaskDueDate(
  taskId: number,
  dueDate: string | null
) {
  const user = await currentUser();
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
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.status !== undefined) {
    updateData.status = input.status;
    updateData.completed = input.status === "completed";
  }
  if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;

  if (Object.keys(updateData).length === 0) return;

  await db
    .update(tasks)
    .set(updateData)
    .where(and(eq(tasks.id, input.id), eq(tasks.userId, user.id)));
}

export async function addProjectTasksAction(task: Task): Promise<Task> {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");
  const { title, description, priority, dueDate, caseId } = task;
  const values = {
    title: title.trim(),
    description,
    priority,
    ...(caseId != null ? { caseId } : {}),
    userId: user.id,
    status: "in-progress" as const,
    completed: false,
    dueDate: dueDate ?? null,
  };

  const newTask = await db.insert(tasks).values(values).returning();
  return newTask[0];
}
