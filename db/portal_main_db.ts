import { db, type DrizzleDB } from "./db";
import { caseFiles, cases, clientPortalTokens, clients } from "./schema";
import { eq, inArray } from "drizzle-orm";

export type PortalTokenRow = typeof clientPortalTokens.$inferSelect;
export type ClientRow = typeof clients.$inferSelect;
export type CaseRow = typeof cases.$inferSelect;
export type CaseFileRow = typeof caseFiles.$inferSelect;

/**
 * Public, token-scoped reads/writes backing the client portal's main page,
 * availability lookups, and file downloads — distinct from the agency-side
 * (userId-scoped) `CasesDB`/`ClientsDB`.
 */
export interface PortalMainDB {
  getPortalByToken(token: string): Promise<PortalTokenRow[]>;
  touchLastAccessed(portalId: number): Promise<void>;
  getClientById(clientId: number): Promise<ClientRow[]>;
  getCasesForClient(clientId: number): Promise<CaseRow[]>;
  getCaseFilesForCases(caseIds: number[]): Promise<CaseFileRow[]>;
  getCaseFileById(fileId: number): Promise<CaseFileRow[]>;
  getCaseById(caseId: number): Promise<CaseRow[]>;
}

export class PortalMainDrizzle implements PortalMainDB {
  constructor(private readonly db: DrizzleDB) {}

  async getPortalByToken(token: string): Promise<PortalTokenRow[]> {
    return this.db
      .select()
      .from(clientPortalTokens)
      .where(eq(clientPortalTokens.token, token))
      .limit(1);
  }

  async touchLastAccessed(portalId: number): Promise<void> {
    await this.db
      .update(clientPortalTokens)
      .set({ lastAccessedAt: new Date() })
      .where(eq(clientPortalTokens.id, portalId));
  }

  async getClientById(clientId: number): Promise<ClientRow[]> {
    return this.db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
  }

  async getCasesForClient(clientId: number): Promise<CaseRow[]> {
    return this.db.select().from(cases).where(eq(cases.clientId, clientId));
  }

  async getCaseFilesForCases(caseIds: number[]): Promise<CaseFileRow[]> {
    if (caseIds.length === 0) return [];
    return this.db
      .select()
      .from(caseFiles)
      .where(inArray(caseFiles.caseId, caseIds));
  }

  async getCaseFileById(fileId: number): Promise<CaseFileRow[]> {
    return this.db
      .select()
      .from(caseFiles)
      .where(eq(caseFiles.id, fileId))
      .limit(1);
  }

  async getCaseById(caseId: number): Promise<CaseRow[]> {
    return this.db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  }
}

export const portalMainDrizzle = new PortalMainDrizzle(db);
