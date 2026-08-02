import { db, type DrizzleDB } from "../db";
import { clients, outlookEmails, scheduledEmails, users } from "../schema";
import { and, asc, eq, lte, ne } from "drizzle-orm";

export type ScheduledEmailAttachment = {
  name: string;
  mimeType?: string | null;
  data?: string | null;
  path?: string | null;
  url?: string | null;
};

export type InsertSchEmail = {
  toEmail: string;
  toName: string | null;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  scheduledAt: Date;
  timezone: string;
  recurring: string | null;
  status: string;
  attachments: ScheduledEmailAttachment[] | null;
  clientId: number | null;
  userId: string;
};

export type Claimed = {
  id: number;
  toEmail: string;
  toName: string | null;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  scheduledAt: Date;
  timezone: string;
  recurring: string | null;
  status: string;
  sentAt: Date | null;
  errorMessage: string | null;
  attachments: ScheduledEmailAttachment[] | null;
  clientId: number | null;
  userId: string;
  createdAt: Date | null;
}[];

export type UserRows = {
  name: string | null;
  email: string;
}[];

export type ScheEmail = {
  id: number;
  toEmail: string;
  toName: string | null;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  scheduledAt: Date;
  timezone: string;
  recurring: string | null;
  status: string;
  sentAt: Date | null;
  errorMessage: string | null;
  attachments: ScheduledEmailAttachment[] | null;
  clientId: number | null;
  userId: string;
  createdAt: Date | null;
};

export interface ScheduledEmailsDB {
  getScheduledEmailsByUser(userId: string): Promise<ScheEmail[]>;
  getDueScheduledEmailIds(): Promise<{ id: number }[]>;
  claimEmail(scheduledEmailId: number): Promise<Claimed>;
  unclaimEmail(scheduledEmailId: number): Promise<void>;
  markAsFailed(scheduledEmailId: number): Promise<void>;
  getUserRows(userId: string): Promise<UserRows>;
  getAllClients(
    userId: string
  ): Promise<{ id: number; email: string | null }[]>;
  insertOutlookEmail(
    outlookId: string,
    conversationId: string,
    scheduledEmail: ScheEmail,
    fromEmail: string,
    fromName: string,
    clientId: number | null,
    userId: string
  ): Promise<void>;
  catchFailedInsertOutlookEmail(
    errMsg: string,
    scheduledEmailId: number
  ): Promise<void>;
  insertScheduledEmail(input: InsertSchEmail): Promise<InsertSchEmail>;
  getScheduledEmailById(
    scheduledEmailId: number,
    userId: string
  ): Promise<{ id: number }[]>;
  deleteScheduledEmailById(
    scheduledEmailId: number,
    userId: string
  ): Promise<{ id: number }[]>;
}

export class ScheduledEmailsDrizzle implements ScheduledEmailsDB {
  constructor(private readonly db: DrizzleDB) {}

  async getScheduledEmailsByUser(userId: string): Promise<ScheEmail[]> {
    return this.db
      .select()
      .from(scheduledEmails)
      .where(eq(scheduledEmails.userId, userId))
      .orderBy(asc(scheduledEmails.scheduledAt));
  }

  async getDueScheduledEmailIds(): Promise<{ id: number }[]> {
    return this.db
      .select({ id: scheduledEmails.id })
      .from(scheduledEmails)
      .where(
        and(
          eq(scheduledEmails.status, "pending"),
          lte(scheduledEmails.scheduledAt, new Date())
        )
      );
  }

  async claimEmail(scheduledEmailId: number): Promise<Claimed | []> {
    return this.db
      .update(scheduledEmails)
      .set({ status: "sent", sentAt: new Date() })
      .where(
        and(
          eq(scheduledEmails.id, scheduledEmailId),
          eq(scheduledEmails.status, "pending")
        )
      )
      .returning();
  }

  async unclaimEmail(scheduledEmailId: number): Promise<void> {
    // Reverts a transient pre-send failure back to "pending" so the cron
    // picks it up again on the next tick instead of leaving it stuck.
    await this.db
      .update(scheduledEmails)
      .set({ status: "pending", sentAt: null })
      .where(eq(scheduledEmails.id, scheduledEmailId));
  }

  async markAsFailed(scheduledEmailId: number): Promise<void> {
    await this.db
      .update(scheduledEmails)
      .set({
        status: "failed",
        errorMessage: "Outlook not connected for user",
      })
      .where(eq(scheduledEmails.id, scheduledEmailId));
  }

  async getUserRows(userId: string): Promise<UserRows> {
    return this.db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
  }

  async getAllClients(
    userId: string
  ): Promise<{ id: number; email: string | null }[]> {
    return this.db
      .select({ id: clients.id, email: clients.email })
      .from(clients)
      .where(eq(clients.userId, userId));
  }

  async insertOutlookEmail(
    outlookId: string,
    conversationId: string,
    scheduledEmail: ScheEmail,
    fromEmail: string,
    fromName: string,
    clientId: number | null,
    userId: string
  ): Promise<void> {
    await this.db.insert(outlookEmails).values({
      outlookId,
      conversationId,
      subject: scheduledEmail.subject,
      snippet:
        scheduledEmail.bodyText?.slice(0, 200) ||
        scheduledEmail.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 200),
      fromEmail,
      fromName,
      toEmails: [scheduledEmail.toEmail],
      bodyHtml: scheduledEmail.bodyHtml,
      bodyText: scheduledEmail.bodyText || null,
      isRead: true,
      isStarred: false,
      isArchived: false,
      isSent: true,
      hasAttachments: (scheduledEmail.attachments?.length ?? 0) > 0,
      sentAt: new Date(),
      clientId,
      userId,
    });
  }

  async insertScheduledEmail({
    toEmail,
    toName,
    subject,
    bodyHtml,
    bodyText,
    scheduledAt,
    timezone,
    recurring,
    status,
    attachments,
    clientId,
    userId,
  }: InsertSchEmail): Promise<InsertSchEmail> {
    const inserted = await this.db
      .insert(scheduledEmails)
      .values({
        toEmail,
        toName,
        subject,
        bodyHtml,
        bodyText,
        scheduledAt,
        timezone,
        recurring,
        status: status,
        attachments,
        clientId,
        userId: userId,
      })
      .returning();
    return inserted[0];
  }

  async catchFailedInsertOutlookEmail(
    errMsg: string,
    scheduledEmailId: number
  ): Promise<void> {
    await this.db
      .update(scheduledEmails)
      .set({ status: "failed", errorMessage: errMsg })
      .where(eq(scheduledEmails.id, scheduledEmailId));
  }

  async getScheduledEmailById(
    scheduledEmailId: number,
    userId: string
  ): Promise<{ id: number }[]> {
    return this.db
      .select({ id: scheduledEmails.id })
      .from(scheduledEmails)
      .where(
        and(
          eq(scheduledEmails.id, scheduledEmailId),
          eq(scheduledEmails.userId, userId)
        )
      )
      .limit(1);
  }

  async deleteScheduledEmailById(
    scheduledEmailId: number,
    userId: string
  ): Promise<{ id: number }[]> {
    // Never delete a sent row — it is the only record that the email went out
    return this.db
      .delete(scheduledEmails)
      .where(
        and(
          eq(scheduledEmails.id, scheduledEmailId),
          eq(scheduledEmails.userId, userId),
          ne(scheduledEmails.status, "sent")
        )
      )
      .returning({ id: scheduledEmails.id });
  }
}

export const scheduledEmailsDrizzle = new ScheduledEmailsDrizzle(db);
