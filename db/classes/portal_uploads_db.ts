import { db, type DrizzleDB } from "../db";
import {
  caseFiles,
  cases,
  clientPortalTokens,
  clients,
  documentRequestItems,
  meetingDocumentRequests,
  users,
} from "../schema";
import { and, eq, sql } from "drizzle-orm";

export type PortalTokenRow = typeof clientPortalTokens.$inferSelect;
export type CaseFileRow = typeof caseFiles.$inferSelect;
export type NewCaseFileRow = typeof caseFiles.$inferInsert;
export type ClientRow = typeof clients.$inferSelect;

export type DocRequestItemWithRequest = {
  itemId: number;
  itemName: string;
  itemDescription: string | null;
  itemStatus: string;
  requestId: number;
  requestStatus: string;
  requestClientId: number | null;
};

export type DocRequestItemUpdateData = {
  status: string;
  uploadedFileId: number;
  uploadedAt: Date;
  aiVerdict?: string;
  aiReasoning?: string;
  aiAnalyzedAt?: Date;
};

export interface PortalUploadsDB {
  getPortalTokenByToken(token: string): Promise<PortalTokenRow[]>;
  getDocumentRequestItemWithRequest(
    itemId: number
  ): Promise<DocRequestItemWithRequest[]>;
  getFirstCaseForClient(clientId: number): Promise<{ id: number }[]>;
  getCaseForClient(caseId: number, clientId: number): Promise<{ id: number }[]>;
  getClientById(clientId: number): Promise<ClientRow[]>;
  insertCaseFile(values: NewCaseFileRow): Promise<CaseFileRow>;
  updateDocumentRequestItem(
    itemId: number,
    data: DocRequestItemUpdateData
  ): Promise<void>;
  incrementAiCredits(userId: string): Promise<void>;
  /** Inserts a case file and bumps the user's storage counter atomically. */
  insertCaseFileWithStorage(values: NewCaseFileRow): Promise<CaseFileRow>;
}

export class PortalUploadsDrizzle implements PortalUploadsDB {
  constructor(private readonly db: DrizzleDB) {}

  async getPortalTokenByToken(token: string): Promise<PortalTokenRow[]> {
    return this.db
      .select()
      .from(clientPortalTokens)
      .where(eq(clientPortalTokens.token, token))
      .limit(1);
  }

  async getDocumentRequestItemWithRequest(
    itemId: number
  ): Promise<DocRequestItemWithRequest[]> {
    return this.db
      .select({
        itemId: documentRequestItems.id,
        itemName: documentRequestItems.name,
        itemDescription: documentRequestItems.description,
        itemStatus: documentRequestItems.status,
        requestId: meetingDocumentRequests.id,
        requestStatus: meetingDocumentRequests.status,
        requestClientId: meetingDocumentRequests.clientId,
      })
      .from(documentRequestItems)
      .innerJoin(
        meetingDocumentRequests,
        eq(documentRequestItems.requestId, meetingDocumentRequests.id)
      )
      .where(eq(documentRequestItems.id, itemId))
      .limit(1);
  }

  async getFirstCaseForClient(clientId: number): Promise<{ id: number }[]> {
    return this.db
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.clientId, clientId))
      .limit(1);
  }

  async getCaseForClient(
    caseId: number,
    clientId: number
  ): Promise<{ id: number }[]> {
    return this.db
      .select({ id: cases.id })
      .from(cases)
      .where(and(eq(cases.id, caseId), eq(cases.clientId, clientId)))
      .limit(1);
  }

  async getClientById(clientId: number): Promise<ClientRow[]> {
    return this.db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
  }

  async insertCaseFile(values: NewCaseFileRow): Promise<CaseFileRow> {
    const [inserted] = await this.db
      .insert(caseFiles)
      .values(values)
      .returning();
    return inserted;
  }

  async updateDocumentRequestItem(
    itemId: number,
    data: DocRequestItemUpdateData
  ): Promise<void> {
    await this.db
      .update(documentRequestItems)
      .set(data)
      .where(eq(documentRequestItems.id, itemId));
  }

  async incrementAiCredits(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ aiCredits: sql`${users.aiCredits} + 1` })
      .where(eq(users.userId, userId));
  }

  async insertCaseFileWithStorage(
    values: NewCaseFileRow
  ): Promise<CaseFileRow> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.insert(caseFiles).values(values).returning();
      await tx
        .update(users)
        .set({ storage: sql`${users.storage} + ${values.size}` })
        .where(eq(users.userId, values.userId ?? ""));
      return row;
    });
  }
}

export const portalUploadsDrizzle = new PortalUploadsDrizzle(db);
