import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { clients, outlookEmails, scheduledEmails, users } from "./schema";
import { and, eq, ne } from "drizzle-orm";

const isProd = process.env.NODE_ENV === "production";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set in the environment variables. Please check your root .env file."
  );
}

const client = postgres(url, {
  ssl: isProd ? "require" : false,
});

export const db = drizzle(client, { schema });

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
  clientId: number | null;
  userId: string;
  createdAt: Date | null;
};

export interface DBDrizzle {
  claimEmail(scheduledEmailId: number): Promise<Claimed>;
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
export class Drizzle implements DBDrizzle {
  async claimEmail(scheduledEmailId: number): Promise<Claimed | []> {
    return db
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

  async markAsFailed(scheduledEmailId: number): Promise<void> {
    await db
      .update(scheduledEmails)
      .set({
        status: "failed",
        errorMessage: "Outlook not connected for user",
      })
      .where(eq(scheduledEmails.id, scheduledEmailId));
  }

  async getUserRows(userId: string): Promise<UserRows> {
    return db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
  }

  async getAllClients(
    userId: string
  ): Promise<{ id: number; email: string | null }[]> {
    return db
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
    await db.insert(outlookEmails).values({
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
    clientId,
    userId,
  }: InsertSchEmail): Promise<InsertSchEmail> {
    const inserted = await db
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
    await db
      .update(scheduledEmails)
      .set({ status: "failed", errorMessage: errMsg })
      .where(eq(scheduledEmails.id, scheduledEmailId));
  }

  async getScheduledEmailById(
    scheduledEmailId: number,
    userId: string
  ): Promise<{ id: number }[]> {
    return db
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
    return db
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

export const DrizzleInstance = new Drizzle();
