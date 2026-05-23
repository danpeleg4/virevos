"use server";

import { db } from "@db/db";
import { caseNotes, caseFiles, cases, tasks, users } from "@db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/supabase/auth";
import { AddFileMetadataInput, Case } from "@/types/cases";
import { uploadFile, deleteFile } from "../storage";
import { FILES_BUCKET } from "../supabase/supabase";
import { assertCanAddCase, assertCanAddFile } from "../plan_limits";
import { MAX_NAME, requireString } from "../util/validation";

export async function deleteCase(caseId: number) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  const files = await db
    .select({ path: caseFiles.path, size: caseFiles.size })
    .from(caseFiles)
    .where(and(eq(caseFiles.caseId, caseId), eq(caseFiles.userId, user.id)));

  // Storage deletes run outside the DB tx — they're external I/O and
  // we'd rather a partial storage failure not block DB cleanup.
  await Promise.all(files.map((f) => deleteFile(FILES_BUCKET, f.path)));

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  await db.transaction(async (tx) => {
    await tx
      .delete(caseFiles)
      .where(and(eq(caseFiles.caseId, caseId), eq(caseFiles.userId, user.id)));

    if (totalSize > 0) {
      await tx
        .update(users)
        .set({ storage: sql`${users.storage} - ${totalSize}` })
        .where(eq(users.user_id, user.id));
    }

    await tx
      .delete(tasks)
      .where(and(eq(tasks.caseId, caseId), eq(tasks.userId, user.id)));
    await tx
      .delete(caseNotes)
      .where(and(eq(caseNotes.caseId, caseId), eq(caseNotes.userId, user.id)));
    await tx
      .delete(cases)
      .where(and(eq(cases.id, caseId), eq(cases.userId, user.id)));
  });
}

export async function addFileMetadata(
  input: AddFileMetadataInput,
  formData: FormData
) {
  const user = await getCurrentUser();
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

  try {
    await db.transaction(async (tx) => {
      await tx.insert(caseFiles).values({
        caseId: input.caseId,
        userId: user.id,
        name: file.name,
        path: filePath,
        size: file.size,
        mimeType: input.mimeType ?? file.type,
      });
      await tx
        .update(users)
        .set({ storage: sql`${users.storage} + ${file.size}` })
        .where(eq(users.user_id, user.id));
    });
  } catch (err) {
    console.error("Drizzle insert failed:", err);
    // The DB metadata write failed but the storage upload succeeded —
    // best-effort cleanup so we don't leak orphaned files.
    try {
      await deleteFile(FILES_BUCKET, filePath);
    } catch (cleanupErr) {
      console.error("Orphan file cleanup failed:", cleanupErr);
    }
    throw new Error("Failed to save file metadata");
  }

  return { path: filePath, name: file.name, size: file.size };
}

export async function createCase(aCase: Case) {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  await assertCanAddCase(user.id);

  const name = requireString(aCase.name, "name", MAX_NAME);

  // Insert case into DB
  const [inserted] = await db
    .insert(cases)
    .values({
      name,
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
  const user = await getCurrentUser();
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
  const user = await getCurrentUser();
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
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  const { id } = aCase;
  await db
    .update(cases)
    .set({ status: newStatus })
    .where(and(eq(cases.id, id), eq(cases.userId, user.id)));
}

export async function deleteCaseFile(fileId: number) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  const [file] = await db
    .select({ path: caseFiles.path, size: caseFiles.size })
    .from(caseFiles)
    .where(and(eq(caseFiles.id, fileId), eq(caseFiles.userId, user.id)));

  if (!file) throw new Error("File not found");

  await deleteFile(FILES_BUCKET, file.path);

  await db.transaction(async (tx) => {
    await tx
      .delete(caseFiles)
      .where(and(eq(caseFiles.id, fileId), eq(caseFiles.userId, user.id)));
    await tx
      .update(users)
      .set({ storage: sql`${users.storage} - ${file.size}` })
      .where(eq(users.user_id, user.id));
  });
}
