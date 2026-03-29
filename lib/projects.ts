"use server";

import { db } from "@db/db";
import { projectNotes, projectFiles, projects, tasks, users } from "@db/schema";
import { and, eq, sql } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { AddFileMetadataInput, Project } from "@/types/projects";
import { uploadFile, deleteFile } from "./storage";
import { FILES_BUCKET } from "./supabase";
import { assertCanAddProject, assertCanAddFile } from "./plan_limits";

export async function deleteProject(projectId: number) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  // Delete project files
  const files = await db
      .select({ path: projectFiles.path, size: projectFiles.size })
      .from(projectFiles)
      .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.userId, user.id)));

  if (!files) throw new Error("File not found");

  for (const file of files) {
    await deleteFile(FILES_BUCKET, file.path);
  }

  await db.delete(projectFiles).where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.userId, user.id)));

  // Delete project tasks
  await db
    .delete(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, user.id)));
  // Delete project notes
  await db
    .delete(projectNotes)
    .where(
      and(
        eq(projectNotes.projectId, projectId),
        eq(projectNotes.userId, user.id)
      )
    );

  // Delete project
  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
}

export async function addFileMetadata(input: AddFileMetadataInput, formData: FormData) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");
  await assertCanAddFile(user.id, file.size);
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const filePath = `projects/${user.id}/${Date.now()}-${safeName}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  try {
    await uploadFile(FILES_BUCKET, filePath, fileBuffer, file.type);
  } catch (uploadError) {
    console.error("Storage upload failed:", uploadError);
    throw new Error("Failed to upload file");
  }

  // Save metadata in Drizzle and increment storage usage
  try {
    await db.insert(projectFiles).values({
      projectId: input.projectId,
      userId: user.id,
      name: file.name,
      path: filePath,
      size: file.size,
      mimeType: input.mimeType ?? file.type,
    });
    await db
      .update(users)
      .set({ storage: sql`${users.storage} + ${file.size}` })
      .where(eq(users.user_id, user.id));
  } catch (err) {
    console.error("Drizzle insert failed:", err);
    throw new Error("Failed to save file metadata");
  }

  return { path: filePath, name: file.name, size: file.size };
}

export async function createProject(project: Project) {
  const user = await currentUser();
  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  await assertCanAddProject(user.id);

  // Insert project into DB
  const [inserted] = await db
    .insert(projects)
    .values({
      name: project.name,
      userId: user.id,
      clientId: project.clientId ?? undefined,
      status: project.status ?? "active",
      dueDate: project.dueDate ?? undefined,
      priority: project.priority ?? "medium",
    })
    .returning();

  return {
    ...inserted,
    stats: { totalTasks: 0, completedTasks: 0, percentage: 0 },
  };
}

export async function addProjectNotes(newNote: string, projectId: number) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  await db.insert(projectNotes).values({
    content: newNote,
    userId: user.id,
    projectId,
  });
}

export async function updateProject(input: {
  id: number;
  name?: string;
  description?: string;
  status?: string;
  dueDate?: string | null;
  priority?: string;
  clientId?: number | null;
}) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.clientId !== undefined) updateData.clientId = input.clientId;

  if (Object.keys(updateData).length === 0) return;

  await db
    .update(projects)
    .set(updateData)
    .where(and(eq(projects.id, input.id), eq(projects.userId, user.id)));
}

export async function changeProjectStatus(project: Project, newStatus: string) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  const { id } = project;
  await db
    .update(projects)
    .set({ status: newStatus })
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)));
}

export async function deleteProjectFile(fileId: number) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  const [file] = await db
    .select({ path: projectFiles.path, size: projectFiles.size })
    .from(projectFiles)
    .where(and(eq(projectFiles.id, fileId), eq(projectFiles.userId, user.id)));

  if (!file) throw new Error("File not found");

  await deleteFile(FILES_BUCKET, file.path);

  await db
    .delete(projectFiles)
    .where(and(eq(projectFiles.id, fileId), eq(projectFiles.userId, user.id)));

  await db
    .update(users)
    .set({ storage: sql`${users.storage} - ${file.size}` })
    .where(eq(users.user_id, user.id));
}
