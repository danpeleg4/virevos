"use server";

import { db } from "@db/db";
import { caseNotes, caseFiles, cases, tasks, users } from "@db/schema";
import { and, eq, sql } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { AddFileMetadataInput, Case } from "@/types/cases";
import { uploadFile, deleteFile } from "./storage";
import { FILES_BUCKET } from "./supabase";
import { assertCanAddCase, assertCanAddFile } from "./plan_limits";

export async function deleteCase(caseId: number) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  // Delete case files
  const files = await db
    .select({ path: caseFiles.path, size: caseFiles.size })
    .from(caseFiles)
    .where(
      and(
        eq(caseFiles.caseId, caseId),
        eq(caseFiles.userId, user.id)
      )
    );

  for (const file of files) {
    await deleteFile(FILES_BUCKET, file.path);
  }

  await db
    .delete(caseFiles)
    .where(
      and(
        eq(caseFiles.caseId, caseId),
        eq(caseFiles.userId, user.id)
      )
    );

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > 0) {
    await db
      .update(users)
      .set({ storage: sql`${users.storage} - ${totalSize}` })
      .where(eq(users.user_id, user.id));
  }

  // Delete case tasks
  await db
    .delete(tasks)
    .where(and(eq(tasks.caseId, caseId), eq(tasks.userId, user.id)));
  // Delete case notes
  await db
    .delete(caseNotes)
    .where(
      and(
        eq(caseNotes.caseId, caseId),
        eq(caseNotes.userId, user.id)
      )
    );

  // Delete case
  await db
    .delete(cases)
    .where(and(eq(cases.id, caseId), eq(cases.userId, user.id)));
}

export async function addFileMetadata(
  input: AddFileMetadataInput,
  formData: FormData
) {
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
    await db.insert(caseFiles).values({
      caseId: input.caseId,
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

export async function createCase(aCase: Case) {
  const user = await currentUser();
  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  await assertCanAddCase(user.id);

  // Insert case into DB
  const [inserted] = await db
    .insert(cases)
    .values({
      name: aCase.name,
      userId: user.id,
      clientId: aCase.clientId ?? undefined,
      status: aCase.status ?? "active",
      dueDate: aCase.dueDate ?? undefined,
      priority: aCase.priority ?? "medium",
    })
    .returning();

  return {
    ...inserted,
    stats: { totalTasks: 0, completedTasks: 0, percentage: 0 },
  };
}

export async function addCaseNotes(newNote: string, caseId: number) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  await db.insert(caseNotes).values({
    content: newNote,
    userId: user.id,
    caseId,
  });
}

export async function updateCase(input: {
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
    .update(cases)
    .set(updateData)
    .where(and(eq(cases.id, input.id), eq(cases.userId, user.id)));
}

export async function changeCaseStatus(aCase: Case, newStatus: string) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  const { id } = aCase;
  await db
    .update(cases)
    .set({ status: newStatus })
    .where(and(eq(cases.id, id), eq(cases.userId, user.id)));
}

export async function deleteCaseFile(fileId: number) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  const [file] = await db
    .select({ path: caseFiles.path, size: caseFiles.size })
    .from(caseFiles)
    .where(and(eq(caseFiles.id, fileId), eq(caseFiles.userId, user.id)));

  if (!file) throw new Error("File not found");

  await deleteFile(FILES_BUCKET, file.path);

  await db
    .delete(caseFiles)
    .where(and(eq(caseFiles.id, fileId), eq(caseFiles.userId, user.id)));

  await db
    .update(users)
    .set({ storage: sql`${users.storage} - ${file.size}` })
    .where(eq(users.user_id, user.id));
}
