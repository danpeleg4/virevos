"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import {
  meetingDocumentRequests,
  documentRequestItems,
  events,
  caseFiles,
} from "@db/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type {
  DocumentRequestItem,
  PendingDocRequest,
  UpdateDocumentRequestPatch,
} from "@/types/document_requests";

type RequestRow = {
  id: number;
  approvedAt: Date | null;
  eventTitle: string;
  eventDateTime: Date;
};

async function getItemsByRequest(requestRows: RequestRow[]) {
  const requestIds = requestRows.map((r) => r.id);
  const itemRows = await db
    .select({
      id: documentRequestItems.id,
      requestId: documentRequestItems.requestId,
      name: documentRequestItems.name,
      description: documentRequestItems.description,
      sortOrder: documentRequestItems.sortOrder,
      status: documentRequestItems.status,
      uploadedFileId: documentRequestItems.uploadedFileId,
      uploadedAt: documentRequestItems.uploadedAt,
      aiVerdict: documentRequestItems.aiVerdict,
      aiReasoning: documentRequestItems.aiReasoning,
      aiAnalyzedAt: documentRequestItems.aiAnalyzedAt,
      uploadedFileName: caseFiles.name,
      uploadedFilePath: caseFiles.path,
    })
    .from(documentRequestItems)
    .leftJoin(caseFiles, eq(documentRequestItems.uploadedFileId, caseFiles.id))
    .where(inArray(documentRequestItems.requestId, requestIds))
    .orderBy(asc(documentRequestItems.sortOrder));

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
  return itemsByRequest;
}

export async function listPendingDocumentRequests(): Promise<
  PendingDocRequest[]
> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const requestRows = await db
    .select({
      id: meetingDocumentRequests.id,
      eventId: meetingDocumentRequests.eventId,
      clientId: meetingDocumentRequests.clientId,
      status: meetingDocumentRequests.status,
      createdAt: meetingDocumentRequests.createdAt,
      eventTitle: events.title,
      eventDateTime: events.dateTime,
    })
    .from(meetingDocumentRequests)
    .innerJoin(events, eq(meetingDocumentRequests.eventId, events.id))
    .where(
      and(
        eq(meetingDocumentRequests.userId, user.id),
        eq(meetingDocumentRequests.status, "pending_approval")
      )
    )
    .orderBy(desc(meetingDocumentRequests.createdAt));

  if (requestRows.length === 0) return [];

  const requestIds = requestRows.map((r) => r.id);
  const itemRows = await db
    .select()
    .from(documentRequestItems)
    .where(inArray(documentRequestItems.requestId, requestIds))
    .orderBy(asc(documentRequestItems.sortOrder));

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
  userId: string
): Promise<void> {
  const rows = await db
    .select({ id: meetingDocumentRequests.id })
    .from(meetingDocumentRequests)
    .where(
      and(
        eq(meetingDocumentRequests.id, requestId),
        eq(meetingDocumentRequests.userId, userId)
      )
    )
    .limit(1);
  if (rows.length === 0) throw new Error("Document request not found");
}

export async function updateDocumentRequest(
  requestId: number,
  patch: UpdateDocumentRequestPatch
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  await ensureRequestOwnership(requestId, user.id);

  await db.transaction(async (tx) => {
    if (patch.clientId !== undefined) {
      await tx
        .update(meetingDocumentRequests)
        .set({ clientId: patch.clientId })
        .where(eq(meetingDocumentRequests.id, requestId));
    }

    if (patch.items !== undefined) {
      const existing = await tx
        .select({ id: documentRequestItems.id })
        .from(documentRequestItems)
        .where(eq(documentRequestItems.requestId, requestId));
      const existingIds = new Set(existing.map((r) => r.id));
      const incomingIds = new Set(
        patch.items.filter((i) => i.id !== undefined).map((i) => i.id as number)
      );

      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await tx
          .delete(documentRequestItems)
          .where(inArray(documentRequestItems.id, toDelete));
      }

      for (const item of patch.items) {
        if (item.id !== undefined) {
          if (!existingIds.has(item.id)) continue;
          await tx
            .update(documentRequestItems)
            .set({
              name: item.name,
              description: item.description ?? null,
              sortOrder: item.sortOrder,
            })
            .where(eq(documentRequestItems.id, item.id));
        } else {
          await tx.insert(documentRequestItems).values({
            requestId,
            name: item.name,
            description: item.description ?? null,
            sortOrder: item.sortOrder,
          });
        }
      }
    }
  });
}

export async function approveDocumentRequest(requestId: number): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const rows = await db
    .select({
      clientId: meetingDocumentRequests.clientId,
    })
    .from(meetingDocumentRequests)
    .where(
      and(
        eq(meetingDocumentRequests.id, requestId),
        eq(meetingDocumentRequests.userId, user.id)
      )
    )
    .limit(1);

  if (rows.length === 0) throw new Error("Document request not found");
  if (rows[0].clientId == null) {
    throw new Error("Client must be selected before approval");
  }

  await db
    .update(meetingDocumentRequests)
    .set({ status: "approved", approvedAt: new Date() })
    .where(eq(meetingDocumentRequests.id, requestId));
}

export async function declineDocumentRequest(requestId: number): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  await ensureRequestOwnership(requestId, user.id);

  await db
    .update(meetingDocumentRequests)
    .set({ status: "declined" })
    .where(eq(meetingDocumentRequests.id, requestId));
}

export async function listFulfilledRequestsForAgency(): Promise<
  Array<{
    id: number;
    eventTitle: string;
    eventDateTime: string;
    clientId: number | null;
    approvedAt: string | null;
    items: DocumentRequestItem[];
  }>
> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const requestRows = await db
    .select({
      id: meetingDocumentRequests.id,
      clientId: meetingDocumentRequests.clientId,
      approvedAt: meetingDocumentRequests.approvedAt,
      eventTitle: events.title,
      eventDateTime: events.dateTime,
    })
    .from(meetingDocumentRequests)
    .innerJoin(events, eq(meetingDocumentRequests.eventId, events.id))
    .where(
      and(
        eq(meetingDocumentRequests.userId, user.id),
        eq(meetingDocumentRequests.status, "approved")
      )
    )
    .orderBy(desc(meetingDocumentRequests.approvedAt));

  if (requestRows.length === 0) return [];
  const itemsByRequest = await getItemsByRequest(requestRows);

  return requestRows
    .map((r) => ({
      id: r.id,
      eventTitle: r.eventTitle,
      eventDateTime: r.eventDateTime.toISOString(),
      clientId: r.clientId,
      approvedAt: r.approvedAt?.toISOString() ?? null,
      items: itemsByRequest.get(r.id) ?? [],
    }))
    .filter((r) =>
      r.items.some((it) => it.status === "uploaded" || it.status === "rejected")
    );
}

export async function listApprovedRequestsForClient(clientId: number): Promise<
  Array<{
    id: number;
    eventTitle: string;
    eventDateTime: string;
    approvedAt: string | null;
    items: DocumentRequestItem[];
  }>
> {
  const requestRows = await db
    .select({
      id: meetingDocumentRequests.id,
      approvedAt: meetingDocumentRequests.approvedAt,
      eventTitle: events.title,
      eventDateTime: events.dateTime,
    })
    .from(meetingDocumentRequests)
    .innerJoin(events, eq(meetingDocumentRequests.eventId, events.id))
    .where(
      and(
        eq(meetingDocumentRequests.clientId, clientId),
        eq(meetingDocumentRequests.status, "approved")
      )
    )
    .orderBy(desc(meetingDocumentRequests.approvedAt));
  if (requestRows.length === 0) return [];
  const itemsByRequest = await getItemsByRequest(requestRows);

  return requestRows.map((r) => ({
    id: r.id,
    eventTitle: r.eventTitle,
    eventDateTime: r.eventDateTime.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    items: itemsByRequest.get(r.id) ?? [],
  }));
}
