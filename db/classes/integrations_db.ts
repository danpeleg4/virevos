import { db, type DrizzleDB } from "../db";
import { outlookEmails, outlookTokens } from "../schema";
import { eq } from "drizzle-orm";

export interface IntegrationsDB {
  getOutlookConnection(
    userId: string
  ): Promise<{ connected: boolean | null }[]>;
  deleteOutlookTokens(userId: string): Promise<void>;
  deleteOutlookEmails(userId: string): Promise<void>;
}

export class IntegrationsDrizzle implements IntegrationsDB {
  constructor(private readonly db: DrizzleDB) {}

  async getOutlookConnection(
    userId: string
  ): Promise<{ connected: boolean | null }[]> {
    return this.db
      .select({ connected: outlookTokens.connected })
      .from(outlookTokens)
      .where(eq(outlookTokens.userId, userId))
      .limit(1);
  }

  async deleteOutlookTokens(userId: string): Promise<void> {
    await this.db.delete(outlookTokens).where(eq(outlookTokens.userId, userId));
  }

  async deleteOutlookEmails(userId: string): Promise<void> {
    await this.db.delete(outlookEmails).where(eq(outlookEmails.userId, userId));
  }
}

export const integrationsDrizzle = new IntegrationsDrizzle(db);
