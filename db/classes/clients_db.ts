import { db, type DrizzleDB } from "../db";
import {
  cases,
  clientPortalTokens,
  clients,
  outlookEmails,
  tasks,
} from "../schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";

export type ClientRow = typeof clients.$inferSelect;
export type NewClientRow = typeof clients.$inferInsert;
export type PortalTokenRow = typeof clientPortalTokens.$inferSelect;

export type ClientWithCaseCountsRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  totalCases: number;
  completedCases: number;
  activeCases: number;
};

export type ClientCaseWithStatsRow = {
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

export type ClientOutlookEmailRow = {
  id: number;
  subject: string | null;
  snippet: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string[] | null;
  isRead: boolean | null;
  isSent: boolean | null;
  hasAttachments: boolean | null;
  sentAt: Date;
};

export type PortalDetailsRow = {
  id: number;
  clientId: number;
  token: string;
  enabled: boolean | null;
  settings: PortalTokenRow["settings"];
  lastAccessedAt: Date | null;
  createdAt: Date | null;
  clientName: string | null;
  clientEmail: string | null;
};

export type ClientUpdateData = Partial<
  Pick<NewClientRow, "name" | "email" | "phone" | "notes" | "status">
>;

export interface ClientsDB {
  getClientsWithCaseCounts(userId: string): Promise<ClientWithCaseCountsRow[]>;
  getClientWithCaseCounts(
    clientId: number,
    userId: string
  ): Promise<ClientWithCaseCountsRow[]>;
  getClientByName(userId: string, clientName: string): Promise<ClientRow[]>;
  getPortalTokenByClient(
    clientId: number,
    userId: string
  ): Promise<PortalTokenRow[]>;
  getClientCasesWithStats(
    clientId: number,
    userId: string
  ): Promise<ClientCaseWithStatsRow[]>;
  getClientOutlookEmails(
    clientId: number,
    userId: string
  ): Promise<ClientOutlookEmailRow[]>;
  getPortalDetails(
    clientId: number,
    userId: string
  ): Promise<PortalDetailsRow[]>;
  getPortalEnabledClients(
    userId: string
  ): Promise<{ id: number; name: string; email: string | null }[]>;
  insertClient(values: NewClientRow): Promise<ClientRow>;
  updateClient(
    clientId: number,
    userId: string,
    data: ClientUpdateData
  ): Promise<void>;
  deleteClient(clientId: number, userId: string): Promise<void>;
  txAddClientAndPortal(
    clientValues: NewClientRow
  ): Promise<ClientRow & PortalTokenRow>;
}

export class ClientsDrizzle implements ClientsDB {
  constructor(private readonly db: DrizzleDB) {}

  private clientWithCaseCountsSelect() {
    return this.db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        status: clients.status,
        notes: clients.notes,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        totalCases: sql<number>`COUNT(${cases.id})::int`,
        completedCases: sql<number>`COUNT(CASE WHEN ${cases.status} = 'completed' THEN 1 END)::int`,
        activeCases: sql<number>`COUNT(CASE WHEN ${cases.status} = 'active' THEN 1 END)::int`,
      })
      .from(clients)
      .leftJoin(cases, eq(cases.clientId, clients.id));
  }

  async getClientsWithCaseCounts(
    userId: string
  ): Promise<ClientWithCaseCountsRow[]> {
    return this.clientWithCaseCountsSelect()
      .where(eq(clients.userId, userId))
      .groupBy(clients.id);
  }

  async getClientByName(
    userId: string,
    clientName: string
  ): Promise<ClientRow[]> {
    return this.db
      .select()
      .from(clients)
      .where(and(eq(clients.userId, userId), ilike(clients.name, clientName)))
      .orderBy(clients.id)
      .limit(1);
  }

  async getClientWithCaseCounts(
    clientId: number,
    userId: string
  ): Promise<ClientWithCaseCountsRow[]> {
    return this.clientWithCaseCountsSelect()
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
      .groupBy(clients.id)
      .limit(1);
  }

  async getPortalTokenByClient(
    clientId: number,
    userId: string
  ): Promise<PortalTokenRow[]> {
    return this.db
      .select()
      .from(clientPortalTokens)
      .where(
        and(
          eq(clientPortalTokens.clientId, clientId),
          eq(clientPortalTokens.userId, userId)
        )
      )
      .limit(1);
  }

  async getClientCasesWithStats(
    clientId: number,
    userId: string
  ): Promise<ClientCaseWithStatsRow[]> {
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
      .where(and(eq(cases.clientId, clientId), eq(cases.userId, userId)))
      .groupBy(cases.id, clients.name);
  }

  async getClientOutlookEmails(
    clientId: number,
    userId: string
  ): Promise<ClientOutlookEmailRow[]> {
    return this.db
      .select({
        id: outlookEmails.id,
        subject: outlookEmails.subject,
        snippet: outlookEmails.snippet,
        fromEmail: outlookEmails.fromEmail,
        fromName: outlookEmails.fromName,
        toEmails: outlookEmails.toEmails,
        isRead: outlookEmails.isRead,
        isSent: outlookEmails.isSent,
        hasAttachments: outlookEmails.hasAttachments,
        sentAt: outlookEmails.sentAt,
      })
      .from(outlookEmails)
      .where(
        and(
          eq(outlookEmails.clientId, clientId),
          eq(outlookEmails.userId, userId)
        )
      )
      .orderBy(desc(outlookEmails.sentAt))
      .limit(50);
  }

  async getPortalDetails(
    clientId: number,
    userId: string
  ): Promise<PortalDetailsRow[]> {
    return this.db
      .select({
        id: clientPortalTokens.id,
        clientId: clientPortalTokens.clientId,
        token: clientPortalTokens.token,
        enabled: clientPortalTokens.enabled,
        settings: clientPortalTokens.settings,
        lastAccessedAt: clientPortalTokens.lastAccessedAt,
        createdAt: clientPortalTokens.createdAt,
        clientName: clients.name,
        clientEmail: clients.email,
      })
      .from(clientPortalTokens)
      .leftJoin(clients, eq(clientPortalTokens.clientId, clients.id))
      .where(
        and(
          eq(clientPortalTokens.clientId, clientId),
          eq(clientPortalTokens.userId, userId)
        )
      )
      .limit(1);
  }

  async getPortalEnabledClients(
    userId: string
  ): Promise<{ id: number; name: string; email: string | null }[]> {
    return this.db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
      })
      .from(clients)
      .innerJoin(
        clientPortalTokens,
        and(
          eq(clientPortalTokens.clientId, clients.id),
          eq(clientPortalTokens.enabled, true)
        )
      )
      .where(and(eq(clients.userId, userId), eq(clients.status, "active")));
  }

  async insertClient(values: NewClientRow): Promise<ClientRow> {
    const created = await this.db.insert(clients).values(values).returning();
    return created[0];
  }

  async updateClient(
    clientId: number,
    userId: string,
    data: ClientUpdateData
  ): Promise<void> {
    await this.db
      .update(clients)
      .set(data)
      .where(and(eq(clients.userId, userId), eq(clients.id, clientId)));
  }

  async deleteClient(clientId: number, userId: string): Promise<void> {
    await this.db
      .delete(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
  }

  async txAddClientAndPortal(
    clientValues: NewClientRow
  ): Promise<ClientRow & PortalTokenRow> {
    return await this.db.transaction(async (tx) => {
      const client = await tx.insert(clients).values(clientValues).returning();
      const portal = await tx
        .insert(clientPortalTokens)
        .values({
          token: crypto.randomUUID(),
          enabled: true,
          settings: {},
          userId: clientValues.userId,
          clientId: client[0].id,
        })
        .returning();
      return {
        ...portal[0],
        ...client[0],
      };
    });
  }
}

export const clientsDrizzle = new ClientsDrizzle(db);
