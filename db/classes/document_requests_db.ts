import { db, type DrizzleDB } from "../db";
import {
  caseFiles,
  documentRequestItems,
  events,
  meetingDocumentRequests,
} from "../schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

export type DocRequestRow = typeof meetingDocumentRequests.$inferSelect;
export type DocRequestItemRow = typeof documentRequestItems.$inferSelect;
export type NewDocRequestItemRow = typeof documentRequestItems.$inferInsert;

export type PendingRequestRow = {
  id: number;
  eventId: string;
  clientId: number | null;
  status: string;
  createdAt: Date | null;
  eventTitle: string;
  eventDateTime: Date;
};

export type ApprovedRequestRow = {
  id: number;
  approvedAt: Date | null;
  eventTitle: string;
  eventDateTime: Date;
};

export type ItemWithFileRow = {
  id: number;
  requestId: number;
  name: string;
  description: string | null;
  sortOrder: number;
  status: string;
  uploadedFileId: number | null;
  uploadedAt: Date | null;
  aiVerdict: string | null;
  aiReasoning: string | null;
  aiAnalyzedAt: Date | null;
  uploadedFileName: string | null;
  uploadedFilePath: string | null;
};

export interface DocumentRequestsDB {
  getPendingRequests(userId: string): Promise<PendingRequestRow[]>;
  getItemsByRequestIds(requestIds: number[]): Promise<DocRequestItemRow[]>;
  getItemsWithFilesByRequestIds(
    requestIds: number[]
  ): Promise<ItemWithFileRow[]>;
  getRequestOwner(requestId: number, userId: string): Promise<{ id: number }[]>;
  getRequestClientId(
    requestId: number,
    userId: string
  ): Promise<{ clientId: number | null }[]>;
  setRequestClientId(requestId: number, clientId: number | null): Promise<void>;
  getItemIdsForRequest(requestId: number): Promise<{ id: number }[]>;
  deleteItems(itemIds: number[]): Promise<void>;
  updateItem(
    itemId: number,
    data: { name: string; description: string | null; sortOrder: number }
  ): Promise<void>;
  insertItem(values: NewDocRequestItemRow): Promise<void>;
  /** Runs the item add/update/delete + optional clientId change atomically. */
  applyRequestPatch(
    requestId: number,
    patch: {
      clientId?: number | null;
      items?: Array<{
        id?: number;
        name: string;
        description?: string | null;
        sortOrder: number;
      }>;
    }
  ): Promise<void>;
  setRequestStatus(
    requestId: number,
    status: string,
    approvedAt?: Date
  ): Promise<void>;
  getApprovedRequestsForClient(clientId: number): Promise<ApprovedRequestRow[]>;
}

export class DocumentRequestsDrizzle implements DocumentRequestsDB {
  constructor(private readonly db: DrizzleDB) {}

  async getPendingRequests(userId: string): Promise<PendingRequestRow[]> {
    return this.db
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
          eq(meetingDocumentRequests.userId, userId),
          eq(meetingDocumentRequests.status, "pending_approval")
        )
      )
      .orderBy(desc(meetingDocumentRequests.createdAt));
  }

  async getItemsByRequestIds(
    requestIds: number[]
  ): Promise<DocRequestItemRow[]> {
    if (requestIds.length === 0) return [];
    return this.db
      .select()
      .from(documentRequestItems)
      .where(inArray(documentRequestItems.requestId, requestIds))
      .orderBy(asc(documentRequestItems.sortOrder));
  }

  async getItemsWithFilesByRequestIds(
    requestIds: number[]
  ): Promise<ItemWithFileRow[]> {
    if (requestIds.length === 0) return [];
    return this.db
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
      .leftJoin(
        caseFiles,
        eq(documentRequestItems.uploadedFileId, caseFiles.id)
      )
      .where(inArray(documentRequestItems.requestId, requestIds))
      .orderBy(asc(documentRequestItems.sortOrder));
  }

  async getRequestOwner(
    requestId: number,
    userId: string
  ): Promise<{ id: number }[]> {
    return this.db
      .select({ id: meetingDocumentRequests.id })
      .from(meetingDocumentRequests)
      .where(
        and(
          eq(meetingDocumentRequests.id, requestId),
          eq(meetingDocumentRequests.userId, userId)
        )
      )
      .limit(1);
  }

  async getRequestClientId(
    requestId: number,
    userId: string
  ): Promise<{ clientId: number | null }[]> {
    return this.db
      .select({ clientId: meetingDocumentRequests.clientId })
      .from(meetingDocumentRequests)
      .where(
        and(
          eq(meetingDocumentRequests.id, requestId),
          eq(meetingDocumentRequests.userId, userId)
        )
      )
      .limit(1);
  }

  async setRequestClientId(
    requestId: number,
    clientId: number | null
  ): Promise<void> {
    await this.db
      .update(meetingDocumentRequests)
      .set({ clientId })
      .where(eq(meetingDocumentRequests.id, requestId));
  }

  async getItemIdsForRequest(requestId: number): Promise<{ id: number }[]> {
    return this.db
      .select({ id: documentRequestItems.id })
      .from(documentRequestItems)
      .where(eq(documentRequestItems.requestId, requestId));
  }

  async deleteItems(itemIds: number[]): Promise<void> {
    if (itemIds.length === 0) return;
    await this.db
      .delete(documentRequestItems)
      .where(inArray(documentRequestItems.id, itemIds));
  }

  async updateItem(
    itemId: number,
    data: { name: string; description: string | null; sortOrder: number }
  ): Promise<void> {
    await this.db
      .update(documentRequestItems)
      .set(data)
      .where(eq(documentRequestItems.id, itemId));
  }

  async insertItem(values: NewDocRequestItemRow): Promise<void> {
    await this.db.insert(documentRequestItems).values(values);
  }

  async applyRequestPatch(
    requestId: number,
    patch: {
      clientId?: number | null;
      items?: Array<{
        id?: number;
        name: string;
        description?: string | null;
        sortOrder: number;
      }>;
    }
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
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
          patch.items
            .filter((i) => i.id !== undefined)
            .map((i) => i.id as number)
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

  async setRequestStatus(
    requestId: number,
    status: string,
    approvedAt?: Date
  ): Promise<void> {
    await this.db
      .update(meetingDocumentRequests)
      .set(approvedAt !== undefined ? { status, approvedAt } : { status })
      .where(eq(meetingDocumentRequests.id, requestId));
  }

  async getApprovedRequestsForClient(
    clientId: number
  ): Promise<ApprovedRequestRow[]> {
    return this.db
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
  }
}

export const documentRequestsDrizzle = new DocumentRequestsDrizzle(db);
