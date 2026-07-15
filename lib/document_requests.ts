import { getCurrentUser } from "@/lib/supabase/auth";
import type { DocumentRequestsDB } from "@db/document_requests_db";
import type {
  DocumentRequestItem,
  PendingDocRequest,
  UpdateDocumentRequestPatch,
} from "@/types/document_requests";

export async function listPendingDocumentRequests(
  userId: string,
  documentRequestsDb: DocumentRequestsDB
): Promise<PendingDocRequest[]> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const requestRows = await documentRequestsDb.getPendingRequests(userId);

  if (requestRows.length === 0) return [];

  const requestIds = requestRows.map((r) => r.id);
  const itemRows = await documentRequestsDb.getItemsByRequestIds(requestIds);

  const itemsByRequest = new Map<number, DocumentRequestItem[]>();
  for (const item of itemRows) {
    const list = itemsByRequest.get(item.requestId) ?? [];
    list.push({
      id: item.id,
      name: item.name,
      description: item.description,
      sortOrder: item.sortOrder,
      status: item.status as DocumentRequestItem["status"],
      uploadedFileId: item.uploadedFileId,
      uploadedAt: item.uploadedAt?.toISOString() ?? null,
      aiVerdict: (item.aiVerdict as DocumentRequestItem["aiVerdict"]) ?? null,
      aiReasoning: item.aiReasoning ?? null,
      aiAnalyzedAt: item.aiAnalyzedAt?.toISOString() ?? null,
    });
    itemsByRequest.set(item.requestId, list);
  }

  return requestRows.map((r) => ({
    id: r.id,
    eventId: r.eventId,
    eventTitle: r.eventTitle,
    eventDateTime: r.eventDateTime.toISOString(),
    clientId: r.clientId,
    status: r.status as PendingDocRequest["status"],
    createdAt: r.createdAt?.toISOString() ?? null,
    items: itemsByRequest.get(r.id) ?? [],
  }));
}

async function ensureRequestOwnership(
  requestId: number,
  userId: string,
  documentRequestsDb: DocumentRequestsDB
): Promise<void> {
  const rows = await documentRequestsDb.getRequestOwner(requestId, userId);
  if (rows.length === 0) throw new Error("Document request not found");
}

export async function updateDocumentRequest(
  requestId: number,
  patch: UpdateDocumentRequestPatch,
  documentRequestsDb: DocumentRequestsDB
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  await ensureRequestOwnership(requestId, user.id, documentRequestsDb);

  await documentRequestsDb.applyRequestPatch(requestId, patch);
}

export async function approveDocumentRequest(
  requestId: number,
  documentRequestsDb: DocumentRequestsDB
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const rows = await documentRequestsDb.getRequestClientId(requestId, user.id);

  if (rows.length === 0) throw new Error("Document request not found");
  if (rows[0].clientId == null) {
    throw new Error("Client must be selected before approval");
  }

  await documentRequestsDb.setRequestStatus(requestId, "approved", new Date());
}

export async function declineDocumentRequest(
  requestId: number,
  documentRequestsDb: DocumentRequestsDB
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  await ensureRequestOwnership(requestId, user.id, documentRequestsDb);

  await documentRequestsDb.setRequestStatus(requestId, "declined");
}

export async function listApprovedRequestsForClient(
  clientId: number,
  documentRequestsDb: DocumentRequestsDB
): Promise<
  Array<{
    id: number;
    eventTitle: string;
    eventDateTime: string;
    approvedAt: string | null;
    items: DocumentRequestItem[];
  }>
> {
  const requestRows =
    await documentRequestsDb.getApprovedRequestsForClient(clientId);
  if (requestRows.length === 0) return [];

  const requestIds = requestRows.map((r) => r.id);
  const itemRows =
    await documentRequestsDb.getItemsWithFilesByRequestIds(requestIds);

  const itemsByRequest = new Map<number, DocumentRequestItem[]>();
  for (const row of itemRows) {
    const list = itemsByRequest.get(row.requestId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      description: row.description,
      sortOrder: row.sortOrder,
      status: row.status as DocumentRequestItem["status"],
      uploadedFileId: row.uploadedFileId,
      uploadedAt: row.uploadedAt?.toISOString() ?? null,
      aiVerdict: (row.aiVerdict as DocumentRequestItem["aiVerdict"]) ?? null,
      aiReasoning: row.aiReasoning ?? null,
      aiAnalyzedAt: row.aiAnalyzedAt?.toISOString() ?? null,
      uploadedFile:
        row.uploadedFileId != null &&
        row.uploadedFileName &&
        row.uploadedFilePath
          ? {
              id: row.uploadedFileId,
              name: row.uploadedFileName,
              path: row.uploadedFilePath,
            }
          : null,
    });
    itemsByRequest.set(row.requestId, list);
  }

  return requestRows.map((r) => ({
    id: r.id,
    eventTitle: r.eventTitle,
    eventDateTime: r.eventDateTime.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    items: itemsByRequest.get(r.id) ?? [],
  }));
}
