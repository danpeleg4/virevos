"use server"

import {db} from "@/db/db";
import {notes, projects, tasks} from "@/db/schema";
import {eq, sql} from "drizzle-orm";
import {currentUser} from "@clerk/nextjs/server";

export async function deleteProject(projectId: number) {
    await db.delete(tasks).where(eq(tasks.projectId, projectId));
    await db.delete(notes).where(eq(notes.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
}

export async function deleteTask(taskId: number) {
    await db.delete(tasks).where(eq(tasks.id, taskId));
}

export async function updateTaskStatus(status: string, taskId: number) {
    if (!["todo", "in-progress", "completed"].includes(status)){
        throw new Error("Invalid status");
    }

    // get existing task
    const existing = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
    });

    if (!existing) {
        throw new Error("Task not found");
    }

    const prevStatus = existing.status;

    await db
        .update(tasks)
        .set({ status, completed: status === "completed" })
        .where(eq(tasks.id, taskId));

    // only update if status changed
    if (prevStatus !== status) {
        const diff = status === "completed" ? 1 : -1;

        await db
            .update(projects)
            .set({
                tasksCompleted: sql`${projects.tasksCompleted} + ${diff}`
            })
            .where(eq(projects.id, Number(existing.projectId)));
    }
    return { success: true, id: taskId, status }
}

export const changePriorityStatus = async (taskId: number, priority: string) => {
    await db.update(tasks).set({priority: priority}).where(eq(tasks.id, taskId));
}

export const updateTaskDueDate = async (taskId: number, dueDate: string) => {
    await db.update(tasks).set({dueDate: dueDate}).where(eq(tasks.id, taskId));
}

export async function addProjectTasksAction(task: Task): Promise<Task> {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");
    const { title, description, priority, dueDate, projectId } = task;
    const values = {
        title: title.trim(),
        description,
        priority,
        projectId,
        userId: user.id,
        status: "in-progress" as const,
        completed: false,
        dueDate: dueDate || "2025-01-01",
    };

    const newTask = await db.insert(tasks).values(values).returning();
    if (newTask.length > 0) {
        await db
            .update(projects)
            .set({
                totalTasks: sql`${projects.totalTasks} + 1`
            })
            .where(eq(projects.id, Number(projectId)));
    }
    return newTask[0];
}

export async function createProject(project: Project): Promise<Project> {
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }

    const { id, ...rest } = project;
    const inserted = await db
        .insert(projects)
        .values({
            ...rest,
            userId: user.id
        })
        .returning();

    return inserted[0];
}

export async function addNotes(
    newNote: string,
    projectId: number
): Promise<ProjectNote> {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");

    const inserted = await db
        .insert(notes)
        .values({
            content: newNote,
            userId: user.id,
            projectId,
        })
        .returning();

    return inserted[0];
}