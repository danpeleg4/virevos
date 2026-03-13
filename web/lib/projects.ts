"use server";

import { db } from "@db/db";
import { notes, projectFiles, projects, tasks } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { AddFileMetadataInput, Project, ProjectNote } from "@/types/projects";
import { supabase } from "./supabase";

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = project;
  // Insert project into DB
  const inserted = await db
    .insert(projects)
    .values({
      ...rest,
      userId: user.id,
    })
    .returning();

  // Add default stats before returning
  const newProject: Project = {
    ...inserted[0],
    stats: { totalTasks: 0, completedTasks: 0, percentage: 0 },
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

export async function changeProjectStatus(project: Project, newStatus: string) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  const { id } = project;
  await db
    .update(projects)
    .set({ status: newStatus })
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)));
}

export interface UploadedAttachment {
  path: string;
  url: string;
  name: string;
  size: number;
}

export async function uploadCommunicationAttachment(
  file: File
): Promise<UploadedAttachment> {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  const filePath = `communications/${user.id}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from("ProjectFiles")
    .upload(filePath, file, { upsert: false });

  if (error) {
    console.error("Storage upload failed:", error);
    throw new Error("Failed to upload file");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("ProjectFiles").getPublicUrl(filePath);

  return { path: filePath, url: publicUrl, name: file.name, size: file.size };
}
