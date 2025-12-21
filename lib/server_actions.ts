"use server"

import { db } from "@/db/db";
import { notes, projects, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    await db
        .update(tasks)
        .set({ status, completed: status === "completed" })
        .where(eq(tasks.id, taskId));

    return { success: true, id: taskId, status }
}

export async function changePriorityStatus(taskId: number, priority: string){
    await db.update(tasks).set({priority: priority}).where(eq(tasks.id, taskId));
}

export async function updateTaskDueDate(taskId: number, dueDate: string){
    await db.update(tasks).set({dueDate: dueDate}).where(eq(tasks.id, taskId));
}

export async function addProjectTasksAction(task: { projectId?: number | null } & Task): Promise<Task> {
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
        dueDate: dueDate || "2025-01-01",
    };

    const newTask = await db.insert(tasks).values(values).returning();
    return newTask[0];
}

export async function addFileMetadata(input: AddFileMetadataInput) {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");

    const { error } = await supabase
        .from("project_files")
        .insert({
            project_id: input.projectId,
            user_id: user.id,
            name: input.name,
            path: input.path,
            size: input.size,
            mime_type: input.mimeType,
        });

    if (error) {
        console.error(error);
        throw new Error("Failed to save file metadata");
    }
}

export async function createProject(project: Omit<Project, "id" | "stats">): Promise<Project> {
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }

    // Insert project into DB
    const inserted = await db
        .insert(projects)
        .values({
            ...project,
            userId: user.id
        })
        .returning();

    // Add default stats before returning
    const newProject: Project = {
        ...inserted[0],
        stats: { totalTasks: 0, completedTasks: 0, percentage: 0 }
    };

    return newProject;
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