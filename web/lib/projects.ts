"use server";

import { db } from "@db/db";
import { notes, projectFiles, projects, tasks } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { AddFileMetadataInput, Project } from "@/types/projects";
import { s3, S3_BUCKET } from "./s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { assertCanAddProject } from "./plan_limits";

export async function deleteProject(projectId: number) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");
  await db
    .delete(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, user.id)));
  await db
    .delete(notes)
    .where(and(eq(notes.projectId, projectId), eq(notes.userId, user.id)));
  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
}

export async function addFileMetadata(input: AddFileMetadataInput, file: File) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");
  if (!file) throw new Error("No file provided");
  const filePath = `projects/${user.id}/${Date.now()}-${file.name}`;
  const fls = await db
    .select()
    .from(projectFiles)
    .where(eq(projectFiles.userId, user.id));
  if (fls.length >= 3) return;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: filePath,
        Body: fileBuffer,
        ContentType: file.type,
      })
    );
  } catch (uploadError) {
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

export async function addNotes(newNote: string, projectId: number) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  await db.insert(notes).values({
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
