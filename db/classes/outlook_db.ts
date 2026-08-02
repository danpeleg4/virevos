import { db, type DrizzleDB } from "../db";
import {
  clients,
  outlookEmails,
  outlookSyncState,
  outlookTokens,
} from "../schema";
import { and, desc, eq, ilike, lte, or, SQL } from "drizzle-orm";

export type OutlookTokenRow = typeof outlookTokens.$inferSelect;
export type NewOutlookTokenRow = typeof outlookTokens.$inferInsert;
export type OutlookSyncStateRow = typeof outlookSyncState.$inferSelect;
export type OutlookEmailRow = typeof outlookEmails.$inferSelect;
export type NewOutlookEmailRow = typeof outlookEmails.$inferInsert;

export type OutlookEmailWithClientRow = OutlookEmailRow & {
  clientName: string | null;
};

export type OutlookTokenUpdateData = Partial<
  Pick<
    NewOutlookTokenRow,
    "accessToken" | "refreshToken" | "expiresIn" | "connected"
  >
>;

export type OutlookEmailUpdateData = Partial<
  Pick<NewOutlookEmailRow, "isStarred" | "isArchived" | "isRead">
>;

export interface ListEmailsOptions {
  search: string;
  filter: "all" | "unread" | "starred" | "sent" | "archived";
  limit: number;
  offset: number;
}

export interface SubscriptionsUpdate {
  calendarSubscriptionId: string | null;
  emailSubscriptionId: string | null;
  clientState: string;
  subscriptionExpiration: number;
}

export interface DeltaLinksUpdate {
  calendarDeltaLink: string | null;
  emailDeltaLink: string | null;
  sentEmailDeltaLink: string | null;
}

export interface OutlookDB {
  getTokenByUserId(userId: string): Promise<OutlookTokenRow[]>;
  insertToken(values: NewOutlookTokenRow): Promise<void>;
  updateToken(userId: string, data: OutlookTokenUpdateData): Promise<void>;

  getEmailById(id: number, userId: string): Promise<OutlookEmailRow[]>;
  getEmailsForUser(
    userId: string,
    options: ListEmailsOptions
  ): Promise<OutlookEmailWithClientRow[]>;
  getExistingEmailsForUser(userId: string): Promise<OutlookEmailRow[]>;
  insertEmails(rows: NewOutlookEmailRow[]): Promise<void>;
  updateEmail(id: number, data: OutlookEmailUpdateData): Promise<void>;
  deleteEmail(id: number): Promise<void>;

  getSyncState(userId: string): Promise<OutlookSyncStateRow[]>;
  findSyncStateBySubscriptionId(
    subscriptionId: string
  ): Promise<OutlookSyncStateRow[]>;
  getExpiringSyncStates(threshold: number): Promise<{ userId: string }[]>;
  upsertDeltaLinks(userId: string, data: DeltaLinksUpdate): Promise<void>;
  updateDeltaLinks(userId: string, data: DeltaLinksUpdate): Promise<void>;
  upsertSubscriptions(userId: string, data: SubscriptionsUpdate): Promise<void>;
  updateSubscriptionExpiration(
    userId: string,
    expiration: number
  ): Promise<void>;
}

export class OutlookDrizzle implements OutlookDB {
  constructor(private readonly db: DrizzleDB) {}

  async getTokenByUserId(userId: string): Promise<OutlookTokenRow[]> {
    return this.db
      .select()
      .from(outlookTokens)
      .where(eq(outlookTokens.userId, userId))
      .limit(1);
  }

  async insertToken(values: NewOutlookTokenRow): Promise<void> {
    await this.db.insert(outlookTokens).values(values);
  }

  async updateToken(
    userId: string,
    data: OutlookTokenUpdateData
  ): Promise<void> {
    await this.db
      .update(outlookTokens)
      .set(data)
      .where(eq(outlookTokens.userId, userId));
  }

  async getEmailById(id: number, userId: string): Promise<OutlookEmailRow[]> {
    return this.db
      .select()
      .from(outlookEmails)
      .where(and(eq(outlookEmails.id, id), eq(outlookEmails.userId, userId)))
      .limit(1);
  }

  async getEmailsForUser(
    userId: string,
    options: ListEmailsOptions
  ): Promise<OutlookEmailWithClientRow[]> {
    const conditions: SQL[] = [eq(outlookEmails.userId, userId)];

    if (options.search) {
      conditions.push(
        or(
          ilike(outlookEmails.fromName, `%${options.search}%`),
          ilike(outlookEmails.fromEmail, `%${options.search}%`),
          ilike(outlookEmails.subject, `%${options.search}%`),
          ilike(outlookEmails.snippet, `%${options.search}%`)
        ) as SQL
      );
    }

    if (options.filter === "unread") {
      conditions.push(eq(outlookEmails.isRead, false));
    } else if (options.filter === "starred") {
      conditions.push(eq(outlookEmails.isStarred, true));
    } else if (options.filter === "sent") {
      conditions.push(eq(outlookEmails.isSent, true));
    } else if (options.filter === "archived") {
      conditions.push(eq(outlookEmails.isArchived, true));
    }

    const rows = await this.db
      .select({
        id: outlookEmails.id,
        outlookId: outlookEmails.outlookId,
        conversationId: outlookEmails.conversationId,
        subject: outlookEmails.subject,
        snippet: outlookEmails.snippet,
        fromEmail: outlookEmails.fromEmail,
        fromName: outlookEmails.fromName,
        toEmails: outlookEmails.toEmails,
        ccEmails: outlookEmails.ccEmails,
        bodyHtml: outlookEmails.bodyHtml,
        bodyText: outlookEmails.bodyText,
        isRead: outlookEmails.isRead,
        isStarred: outlookEmails.isStarred,
        isArchived: outlookEmails.isArchived,
        isSent: outlookEmails.isSent,
        hasAttachments: outlookEmails.hasAttachments,
        sentAt: outlookEmails.sentAt,
        clientId: outlookEmails.clientId,
        userId: outlookEmails.userId,
        createdAt: outlookEmails.createdAt,
        clientName: clients.name,
      })
      .from(outlookEmails)
      .leftJoin(clients, eq(outlookEmails.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(outlookEmails.sentAt))
      .limit(options.limit)
      .offset(options.offset);

    return rows as OutlookEmailWithClientRow[];
  }

  async getExistingEmailsForUser(userId: string): Promise<OutlookEmailRow[]> {
    return this.db
      .select()
      .from(outlookEmails)
      .where(eq(outlookEmails.userId, userId));
  }

  async insertEmails(rows: NewOutlookEmailRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.db.insert(outlookEmails).values(rows);
  }

  async updateEmail(id: number, data: OutlookEmailUpdateData): Promise<void> {
    await this.db
      .update(outlookEmails)
      .set(data)
      .where(eq(outlookEmails.id, id));
  }

  async deleteEmail(id: number): Promise<void> {
    await this.db.delete(outlookEmails).where(eq(outlookEmails.id, id));
  }

  async getSyncState(userId: string): Promise<OutlookSyncStateRow[]> {
    return this.db
      .select()
      .from(outlookSyncState)
      .where(eq(outlookSyncState.userId, userId))
      .limit(1);
  }

  async findSyncStateBySubscriptionId(
    subscriptionId: string
  ): Promise<OutlookSyncStateRow[]> {
    return this.db
      .select()
      .from(outlookSyncState)
      .where(
        or(
          eq(outlookSyncState.calendarSubscriptionId, subscriptionId),
          eq(outlookSyncState.emailSubscriptionId, subscriptionId)
        )
      )
      .limit(1);
  }

  async getExpiringSyncStates(
    threshold: number
  ): Promise<{ userId: string }[]> {
    return this.db
      .select({ userId: outlookSyncState.userId })
      .from(outlookSyncState)
      .where(lte(outlookSyncState.subscriptionExpiration, threshold));
  }

  async upsertDeltaLinks(
    userId: string,
    data: DeltaLinksUpdate
  ): Promise<void> {
    await this.db
      .insert(outlookSyncState)
      .values({ userId, ...data })
      .onConflictDoUpdate({
        target: outlookSyncState.userId,
        set: data,
      });
  }

  async updateDeltaLinks(
    userId: string,
    data: DeltaLinksUpdate
  ): Promise<void> {
    await this.db
      .update(outlookSyncState)
      .set(data)
      .where(eq(outlookSyncState.userId, userId));
  }

  async upsertSubscriptions(
    userId: string,
    data: SubscriptionsUpdate
  ): Promise<void> {
    await this.db
      .insert(outlookSyncState)
      .values({ userId, ...data })
      .onConflictDoUpdate({
        target: outlookSyncState.userId,
        set: data,
      });
  }

  async updateSubscriptionExpiration(
    userId: string,
    expiration: number
  ): Promise<void> {
    await this.db
      .update(outlookSyncState)
      .set({ subscriptionExpiration: expiration })
      .where(eq(outlookSyncState.userId, userId));
  }
}

export const outlookDrizzle = new OutlookDrizzle(db);
