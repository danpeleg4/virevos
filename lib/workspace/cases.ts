import { getCurrentUser } from "@/lib/supabase/auth";
import type {
  CaseFileRow,
  CaseSummaryRow,
  CasesDB,
  CaseUpdateData,
} from "@db/cases_db";
import type { StorageClientInterface } from "@/api_client/supabase_storage_client";
import type { BillingDB } from "@db/billing_db";
import type { PlanLimitsDB } from "@db/plan_limits_db";
import { AddFileMetadataInput, Case } from "@/types/cases";
import { FILES_BUCKET } from "../supabase/supabase";
import { assertCanAddCase, assertCanAddFile } from "../plan_limits";
import { MAX_NAME, requireString, ValidationError } from "../util/validation";

export async function getCasesWithStats(casesDb: CasesDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const [caseRows, allClients] = await Promise.all([
    casesDb.getCasesWithStats(user.id),
    casesDb.getClientsForUser(user.id),
  ]);

  const casesWithStats = caseRows.map((c) => {
    const totalTasks = c.totalTasks;
    const completedTasks = c.completedTasks;
    const percentage =
      totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.status,
      dueDate: c.dueDate,
      priority: c.priority,
      clientId: c.clientId,
      userId: c.userId,
      clientName: c.clientName,
      stats: { totalTasks, completedTasks, percentage },
    };
  });

  return { cases: casesWithStats, allClients };
}

export async function getCaseSummary(
  caseId: number,
  casesDb: CasesDB
): Promise<CaseSummaryRow | null> {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const result = await casesDb.getCaseSummary(caseId, user.id);
  return result[0] ?? null;
}

export async function getCaseNotes(caseId: number, casesDb: CasesDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  return casesDb.getCaseNotes(user.id, caseId);
}

export async function getUserFiles(casesDb: CasesDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  return casesDb.getUserFiles(user.id);
}

export async function getCaseFiles(
  caseId: number,
  casesDb: CasesDB
): Promise<CaseFileRow[]> {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  return casesDb.getCaseFilesByCase(caseId, user.id);
}

export type DownloadedCaseFile = {
  body: Uint8Array;
  name: string;
  mimeType: string | null;
};

export async function downloadCaseFile(
  fileId: number,
  casesDb: CasesDB,
  storage: StorageClientInterface
): Promise<DownloadedCaseFile | null> {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const [file] = await casesDb.getCaseFileById(fileId, user.id);
  if (!file) return null;

  const body = await storage.downloadFile(FILES_BUCKET, file.path);
  return { body, name: file.name, mimeType: file.mimeType };
}

export async function deleteCase(
  caseId: number,
  casesDb: CasesDB,
  storage: StorageClientInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  const files = await casesDb.getCaseFilePaths(caseId, user.id);

  // Storage deletes run outside the DB tx — they're external I/O and
  // we'd rather a partial storage failure not block DB cleanup.
  await Promise.all(files.map((f) => storage.deleteFile(FILES_BUCKET, f.path)));

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  await casesDb.deleteCaseCascade(caseId, user.id, totalSize);
}

export async function addFileMetadata(
  input: AddFileMetadataInput,
  formData: FormData,
  casesDb: CasesDB,
  storage: StorageClientInterface,
  planLimitsDb: PlanLimitsDB,
  billingDb: BillingDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");
  await assertCanAddFile(user.id, file.size, planLimitsDb, billingDb);
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const filePath = `projects/${user.id}/${Date.now()}-${safeName}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  try {
    await storage.uploadFile(FILES_BUCKET, filePath, fileBuffer, file.type);
  } catch (uploadError) {
    console.error("Storage upload failed:", uploadError);
    throw new Error("Failed to upload file");
  }

  try {
    await casesDb.insertCaseFileWithStorage({
      caseId: input.caseId,
      userId: user.id,
      name: file.name,
      path: filePath,
      size: file.size,
      mimeType: input.mimeType ?? file.type,
    });
  } catch (err) {
    console.error("Drizzle insert failed:", err);
    // The DB metadata write failed but the storage upload succeeded —
    // best-effort cleanup so we don't leak orphaned files.
    try {
      await storage.deleteFile(FILES_BUCKET, filePath);
    } catch (cleanupErr) {
      console.error("Orphan file cleanup failed:", cleanupErr);
    }
    throw new Error("Failed to save file metadata");
  }

  return { path: filePath, name: file.name, size: file.size };
}

export async function createCase(
  aCase: Case,
  casesDb: CasesDB,
  planLimitsDb: PlanLimitsDB,
  billingDb: BillingDB
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  await assertCanAddCase(user.id, planLimitsDb, billingDb);

  const name = requireString(aCase.name, "name", MAX_NAME);

  const inserted = await casesDb.insertCase({
    name,
    userId: user.id,
    clientId: aCase.clientId ?? undefined,
    status: aCase.status ?? "active",
    dueDate: aCase.dueDate ?? undefined,
    priority: aCase.priority ?? "medium",
  });

  return {
    ...inserted,
    stats: { totalTasks: 0, completedTasks: 0, percentage: 0 },
  };
}

export async function addCaseNotes(
  newNote: string,
  caseId: number,
  casesDb: CasesDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  await casesDb.insertCaseNote(newNote, user.id, caseId);
}

export async function updateCase(
  input: {
    id: number;
    name?: string;
    description?: string;
    status?: string;
    dueDate?: string | null;
    priority?: string;
    clientId?: number | null;
  },
  casesDb: CasesDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  const updateData: CaseUpdateData = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.clientId !== undefined) updateData.clientId = input.clientId;

  if (Object.keys(updateData).length === 0) return;

  await casesDb.updateCase(input.id, user.id, updateData);
}

export async function changeCaseStatus(
  aCase: Case,
  newStatus: string,
  casesDb: CasesDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  await casesDb.updateCase(aCase.id, user.id, { status: newStatus });
}

export async function deleteCaseFile(
  fileId: number,
  casesDb: CasesDB,
  storage: StorageClientInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  const [file] = await casesDb.getCaseFileById(fileId, user.id);

  if (!file) throw new Error("File not found");

  await storage.deleteFile(FILES_BUCKET, file.path);

  await casesDb.deleteCaseFileWithStorage(fileId, user.id, file.size);
}
