"use server"

import { db } from "@/db/db";
import { notes, projectFiles, projects, tasks } from "@/db/schema";
import {and, eq} from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { AddFileMetadataInput, Project, ProjectNote } from "@/types/projects";
import { supabase } from "./supabase"

export async function deleteProject(projectId: number) {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");
    await db.delete(tasks).where(and(eq(tasks.projectId, projectId), eq(tasks.userId, user.id)));
    await db.delete(notes).where(and(eq(notes.projectId, projectId), eq(notes.userId, user.id)));
    await db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
}

export async function deleteTask(taskId: number) {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");
    await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
}

export async function updateTaskStatus(status: string, taskId: number) {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");
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
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

    return { success: true, id: taskId, status }
}

export async function changePriorityStatus(taskId: number, priority: string){
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");
    await db.update(tasks).set({priority: priority}).where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
}

export async function updateTaskDueDate(taskId: number, dueDate: string){
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");
    await db.update(tasks).set({dueDate: dueDate}).where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
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

export async function addFileMetadata(input: AddFileMetadataInput, file: File) {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");
    if (!file) throw new Error("No file provided");
    const filePath = `projects/${user.id}/${Date.now()}-${file.name}`;
    const fls = await db.select().from(projectFiles).where(eq(projectFiles.userId, user.id));
    if (fls.length >= 3) return
    const { error: uploadError } = await supabase.storage
        .from("ProjectFiles")
        .upload(filePath, file, { upsert: false });

    if (uploadError) {
        console.error("Storage upload failed:", uploadError);
        throw new Error("Failed to upload file");
    }

    // Save metadata in Drizzle
    try {
            await db.insert(projectFiles).values({
                projectId: input.projectId,
                userId: user.id,
                name: file.name,
                path: filePath,
                size: file.size,
                mimeType: input.mimeType ?? file.type,
            });
    } catch (err) {
        console.error("Drizzle insert failed:", err);
        throw new Error("Failed to save file metadata");
    }

    return { path: filePath, name: file.name, size: file.size };
}

export async function createProject(project: Project): Promise<Project> {
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }

    const { id, ...rest } = project;
    // Insert project into DB
    const inserted = await db
        .insert(projects)
        .values({
            ...rest,
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

export async function changeProjectStatus(project: Project, newStatus: string){
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");

    const { id } = project;
    await db.update(projects).set({status: newStatus}).where(and(eq(projects.id, id),
        eq(projects.userId, user.id)));
}