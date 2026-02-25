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

export async function updateTaskDueDate(taskId: number, dueDate: string) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");
  await db
    .update(tasks)
    .set({ dueDate: dueDate })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
}

export async function addProjectTasksAction(
  task: Task
): Promise<Task> {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");
  const { title, description, priority, dueDate, projectId } = task;
  const values = {
    title: title.trim(),
    description,
    priority,
    ...(projectId != null ? { projectId } : {}),
    userId: user.id,
    status: "in-progress" as const,
    completed: false,
    dueDate: dueDate ?? null,
  };

  const newTask = await db.insert(tasks).values(values).returning();
  return newTask[0];
}
