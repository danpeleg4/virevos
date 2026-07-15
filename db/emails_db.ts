import { db, type DrizzleDB } from "./db";
import { outlookEmails } from "./schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export type EmailSearchRow = {
  outlookId: string;
  subject: string | null;
  fromEmail: string | null;
  fromName: string | null;
  sentAt: Date;
  isSent: boolean | null;
  snippet: string | null;
};

export type EmailRecentRow = EmailSearchRow & {
  bodyText: string | null;
  bodyHtml: string | null;
};

export interface EmailsDB {
  getEmailsByOutlookIds(
    userId: string,
    outlookIds: string[]
  ): Promise<EmailSearchRow[]>;
  getRecentUnsentEmails(
    userId: string,
    limit: number
  ): Promise<EmailRecentRow[]>;
}

export class EmailsDrizzle implements EmailsDB {
  constructor(private readonly db: DrizzleDB) {}

  async getEmailsByOutlookIds(
    userId: string,
    outlookIds: string[]
  ): Promise<EmailSearchRow[]> {
    if (outlookIds.length === 0) return [];
    return this.db
      .select({
        outlookId: outlookEmails.outlookId,
        subject: outlookEmails.subject,
        fromEmail: outlookEmails.fromEmail,
        fromName: outlookEmails.fromName,
        sentAt: outlookEmails.sentAt,
        isSent: outlookEmails.isSent,
        snippet: outlookEmails.snippet,
      })
      .from(outlookEmails)
      .where(
        and(
          eq(outlookEmails.userId, userId),
          inArray(outlookEmails.outlookId, outlookIds)
        )
      );
  }

  async getRecentUnsentEmails(
    userId: string,
    limit: number
  ): Promise<EmailRecentRow[]> {
    return this.db
      .select({
        outlookId: outlookEmails.outlookId,
        subject: outlookEmails.subject,
        fromEmail: outlookEmails.fromEmail,
        fromName: outlookEmails.fromName,
        sentAt: outlookEmails.sentAt,
        isSent: outlookEmails.isSent,
        snippet: outlookEmails.snippet,
        bodyText: outlookEmails.bodyText,
        bodyHtml: outlookEmails.bodyHtml,
      })
      .from(outlookEmails)
      .where(
        and(eq(outlookEmails.userId, userId), eq(outlookEmails.isSent, false))
      )
      .orderBy(desc(outlookEmails.sentAt))
      .limit(limit);
  }
}

export const emailsDrizzle = new EmailsDrizzle(db);
