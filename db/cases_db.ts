import { db, type DrizzleDB } from "./db";
import { caseFiles, caseNotes, cases, clients, tasks, users } from "./schema";
import { and, desc, eq, sql } from "drizzle-orm";

export type CaseRow = typeof cases.$inferSelect;
export type NewCaseRow = typeof cases.$inferInsert;
export type CaseFileRow = typeof caseFiles.$inferSelect;
export type NewCaseFileRow = typeof caseFiles.$inferInsert;
export type CaseNoteRow = typeof caseNotes.$inferSelect;
export type ClientRow = typeof clients.$inferSelect;

export type CaseWithStatsRow = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  priority: string;
  clientId: number | null;
  userId: string;
  clientName: string | null;
  totalTasks: number;
  completedTasks: number;
};

export type CaseSummaryRow = {
  id: number;
  name: string;
  clientId: number | null;
  clientName: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
};

export type UserFileRow = {
  id: number;
  name: string;
  path: string;
  size: number;
  mimeType: string | null;
  createdAt: Date | null;
  caseId: number;
  caseName: string | null;
};

export type CaseUpdateData = Partial<
  Pick<
    NewCaseRow,
    "name" | "description" | "status" | "dueDate" | "priority" | "clientId"
  >
>;

export interface CasesDB {
  getCasesWithStats(userId: string): Promise<CaseWithStatsRow[]>;
  getClientsForUser(userId: string): Promise<ClientRow[]>;
  getCaseSummary(caseId: number, userId: string): Promise<CaseSummaryRow[]>;
  getCaseNotes(userId: string, caseId: number): Promise<CaseNoteRow[]>;
  getUserFiles(userId: string): Promise<UserFileRow[]>;
  getCaseFileById(fileId: number, userId: string): Promise<CaseFileRow[]>;
  getCaseFilesByCase(caseId: number, userId: string): Promise<CaseFileRow[]>;
  getCaseFilePaths(
    caseId: number,
    userId: string
  ): Promise<{ path: string; size: number }[]>;
  /** Deletes files, tasks, notes and the case row in one transaction. */
  deleteCaseCascade(
    caseId: number,
    userId: string,
    totalSize: number
  ): Promise<void>;
  /** Inserts file metadata and bumps the user's storage counter atomically. */
  insertCaseFileWithStorage(values: NewCaseFileRow): Promise<void>;
  /** Deletes a file row and reduces the user's storage counter atomically. */
  deleteCaseFileWithStorage(
    fileId: number,
    userId: string,
    size: number
  ): Promise<void>;
  insertCase(values: NewCaseRow): Promise<CaseRow>;
  insertCaseNote(
    content: string,
    userId: string,
    caseId: number
  ): Promise<void>;
  updateCase(
    caseId: number,
    userId: string,
    data: CaseUpdateData
  ): Promise<void>;
  getCaseById(caseId: number, userId: string): Promise<CaseRow[]>;
}

export class CasesDrizzle implements CasesDB {
  constructor(private readonly db: DrizzleDB) {}

  async getCaseById(caseId: number, userId: string): Promise<CaseRow[]> {
    return this.db
      .select()
      .from(cases)
      .where(and(eq(cases.id, caseId), eq(cases.userId, userId)))
      .limit(1);
  }

  async getCasesWithStats(userId: string): Promise<CaseWithStatsRow[]> {
    return this.db
      .select({
        id: cases.id,
        name: cases.name,
        description: cases.description,
        status: cases.status,
        dueDate: cases.dueDate,
        priority: cases.priority,
        clientId: cases.clientId,
        userId: cases.userId,
        clientName: clients.name,
        totalTasks: sql<number>`COUNT(${tasks.id})::int`,
        completedTasks: sql<number>`COALESCE(SUM(CASE WHEN ${tasks.completed} THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(cases)
      .leftJoin(clients, eq(cases.clientId, clients.id))
      .leftJoin(tasks, eq(tasks.caseId, cases.id))
      .where(eq(cases.userId, userId))
      .groupBy(cases.id, clients.name);
  }

  async getClientsForUser(userId: string): Promise<ClientRow[]> {
    return this.db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(clients.id);
  }

  async getCaseSummary(
    caseId: number,
    userId: string
  ): Promise<CaseSummaryRow[]> {
    return this.db
      .select({
        id: cases.id,
        name: cases.name,
        clientId: cases.clientId,
        clientName: clients.name,
        dueDate: cases.dueDate,
        priority: cases.priority,
        status: cases.status,
      })
      .from(cases)
      .leftJoin(clients, eq(cases.clientId, clients.id))
      .where(and(eq(cases.id, caseId), eq(cases.userId, userId)))
      .limit(1);
  }

  async getCaseNotes(userId: string, caseId: number): Promise<CaseNoteRow[]> {
    return this.db
      .select()
      .from(caseNotes)
      .where(and(eq(caseNotes.userId, userId), eq(caseNotes.caseId, caseId)))
      .orderBy(desc(caseNotes.id));
  }

  async getUserFiles(userId: string): Promise<UserFileRow[]> {
    return this.db
      .select({
        id: caseFiles.id,
        name: caseFiles.name,
        path: caseFiles.path,
        size: caseFiles.size,
        mimeType: caseFiles.mimeType,
        createdAt: caseFiles.createdAt,
        caseId: caseFiles.caseId,
        caseName: cases.name,
      })
      .from(caseFiles)
      .leftJoin(
        cases,
        and(eq(caseFiles.caseId, cases.id), eq(cases.userId, userId))
      )
      .where(eq(caseFiles.userId, userId))
      .limit(100);
  }

  async getCaseFileById(
    fileId: number,
    userId: string
  ): Promise<CaseFileRow[]> {
    return this.db
      .select()
      .from(caseFiles)
      .where(and(eq(caseFiles.id, fileId), eq(caseFiles.userId, userId)));
  }

  async getCaseFilesByCase(
    caseId: number,
    userId: string
  ): Promise<CaseFileRow[]> {
    return this.db
      .select()
      .from(caseFiles)
      .where(and(eq(caseFiles.caseId, caseId), eq(caseFiles.userId, userId)));
  }

  async getCaseFilePaths(
    caseId: number,
    userId: string
  ): Promise<{ path: string; size: number }[]> {
    return this.db
      .select({ path: caseFiles.path, size: caseFiles.size })
      .from(caseFiles)
      .where(and(eq(caseFiles.caseId, caseId), eq(caseFiles.userId, userId)));
  }

  async deleteCaseCascade(
    caseId: number,
    userId: string,
    totalSize: number
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(caseFiles)
        .where(and(eq(caseFiles.caseId, caseId), eq(caseFiles.userId, userId)));

      if (totalSize > 0) {
        await tx
          .update(users)
          .set({ storage: sql`${users.storage} - ${totalSize}` })
          .where(eq(users.userId, userId));
      }

      await tx
        .delete(tasks)
        .where(and(eq(tasks.caseId, caseId), eq(tasks.userId, userId)));
      await tx
        .delete(caseNotes)
        .where(and(eq(caseNotes.caseId, caseId), eq(caseNotes.userId, userId)));
      await tx
        .delete(cases)
        .where(and(eq(cases.id, caseId), eq(cases.userId, userId)));
    });
  }

  async insertCaseFileWithStorage(values: NewCaseFileRow): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(caseFiles).values(values);
      await tx
        .update(users)
        .set({ storage: sql`${users.storage} + ${values.size}` })
        .where(eq(users.userId, values.userId ?? ""));
    });
  }

  async deleteCaseFileWithStorage(
    fileId: number,
    userId: string,
    size: number
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(caseFiles)
        .where(and(eq(caseFiles.id, fileId), eq(caseFiles.userId, userId)));
      await tx
        .update(users)
        .set({ storage: sql`${users.storage} - ${size}` })
        .where(eq(users.userId, userId));
    });
  }

  async insertCase(values: NewCaseRow): Promise<CaseRow> {
    const [inserted] = await this.db.insert(cases).values(values).returning();
    return inserted;
  }

  async insertCaseNote(
    content: string,
    userId: string,
    caseId: number
  ): Promise<void> {
    await this.db.insert(caseNotes).values({ content, userId, caseId });
  }

  async updateCase(
    caseId: number,
    userId: string,
    data: CaseUpdateData
  ): Promise<void> {
    await this.db
      .update(cases)
      .set(data)
      .where(and(eq(cases.id, caseId), eq(cases.userId, userId)));
  }
}

export const casesDrizzle = new CasesDrizzle(db);
