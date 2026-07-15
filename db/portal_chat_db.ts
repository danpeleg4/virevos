import { db, type DrizzleDB } from "./db";
import { clientPortalTokens, portalMessages } from "./schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

export type PortalTokenRow = typeof clientPortalTokens.$inferSelect;
export type PortalMessageRow = typeof portalMessages.$inferSelect;

export type InsertedChatMessage = {
  id: number;
  senderType: string;
  body: string;
  readAt: Date | null;
  createdAt: Date | null;
};

export interface PortalChatDB {
  getPortalForUser(clientId: number, userId: string): Promise<PortalTokenRow[]>;
  getPortalByToken(token: string): Promise<PortalTokenRow[]>;
  insertMessage(values: {
    portalId: number;
    clientId: number;
    userId: string;
    senderType: "client" | "agency";
    body: string;
  }): Promise<InsertedChatMessage>;
  setChatStarred(portalId: number, starred: boolean): Promise<void>;
  setChatArchived(portalId: number, archived: boolean): Promise<void>;
  getLatestClientMessage(portalId: number): Promise<{ id: number }[]>;
  markMessageUnread(messageId: number): Promise<void>;
  deleteMessages(portalId: number): Promise<void>;
  resetChatFlags(portalId: number): Promise<void>;
  getMessagesForPortal(portalId: number): Promise<PortalMessageRow[]>;
  markClientMessagesRead(portalId: number): Promise<void>;
  markAgencyMessagesRead(portalId: number): Promise<void>;
}

export class PortalChatDrizzle implements PortalChatDB {
  constructor(private readonly db: DrizzleDB) {}

  async getPortalForUser(
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

  async getPortalByToken(token: string): Promise<PortalTokenRow[]> {
    return this.db
      .select()
      .from(clientPortalTokens)
      .where(eq(clientPortalTokens.token, token))
      .limit(1);
  }

  async insertMessage(values: {
    portalId: number;
    clientId: number;
    userId: string;
    senderType: "client" | "agency";
    body: string;
  }): Promise<InsertedChatMessage> {
    const [inserted] = await this.db
      .insert(portalMessages)
      .values(values)
      .returning({
        id: portalMessages.id,
        senderType: portalMessages.senderType,
        body: portalMessages.body,
        readAt: portalMessages.readAt,
        createdAt: portalMessages.createdAt,
      });
    return inserted;
  }

  async setChatStarred(portalId: number, starred: boolean): Promise<void> {
    await this.db
      .update(clientPortalTokens)
      .set({ chatStarred: starred })
      .where(eq(clientPortalTokens.id, portalId));
  }

  async setChatArchived(portalId: number, archived: boolean): Promise<void> {
    await this.db
      .update(clientPortalTokens)
      .set({ chatArchived: archived })
      .where(eq(clientPortalTokens.id, portalId));
  }

  async getLatestClientMessage(portalId: number): Promise<{ id: number }[]> {
    return this.db
      .select({ id: portalMessages.id })
      .from(portalMessages)
      .where(
        and(
          eq(portalMessages.portalId, portalId),
          eq(portalMessages.senderType, "client")
        )
      )
      .orderBy(desc(portalMessages.createdAt))
      .limit(1);
  }

  async markMessageUnread(messageId: number): Promise<void> {
    await this.db
      .update(portalMessages)
      .set({ readAt: null })
      .where(eq(portalMessages.id, messageId));
  }

  async deleteMessages(portalId: number): Promise<void> {
    await this.db
      .delete(portalMessages)
      .where(eq(portalMessages.portalId, portalId));
  }

  async resetChatFlags(portalId: number): Promise<void> {
    await this.db
      .update(clientPortalTokens)
      .set({ chatStarred: false, chatArchived: false })
      .where(eq(clientPortalTokens.id, portalId));
  }

  async getMessagesForPortal(portalId: number): Promise<PortalMessageRow[]> {
    return this.db
      .select()
      .from(portalMessages)
      .where(eq(portalMessages.portalId, portalId))
      .orderBy(asc(portalMessages.createdAt));
  }

  async markClientMessagesRead(portalId: number): Promise<void> {
    await this.db
      .update(portalMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(portalMessages.portalId, portalId),
          eq(portalMessages.senderType, "client"),
          isNull(portalMessages.readAt)
        )
      );
  }

  async markAgencyMessagesRead(portalId: number): Promise<void> {
    await this.db
      .update(portalMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(portalMessages.portalId, portalId),
          eq(portalMessages.senderType, "agency"),
          isNull(portalMessages.readAt)
        )
      );
  }
}

export const portalChatDrizzle = new PortalChatDrizzle(db);
