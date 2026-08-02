import { db, type DrizzleDB } from "../db";
import { cases, clients, users } from "../schema";
import { count, eq, isNull, lte, or, sql } from "drizzle-orm";

export interface PlanLimitsDB {
  countClients(userId: string): Promise<{ count: number }[]>;
  countCases(userId: string): Promise<{ count: number }[]>;
  getAiCredits(userId: string): Promise<{ ai_credits: number }[]>;
  getStorage(userId: string): Promise<{ storage: number }[]>;
  resetDueCredits(now: Date, nextReset: Date): Promise<{ id: string }[]>;
  incrementAiCredits(userId: string): Promise<void>;
}

export class PlanLimitsDrizzle implements PlanLimitsDB {
  constructor(private readonly db: DrizzleDB) {}

  async countClients(userId: string): Promise<{ count: number }[]> {
    return this.db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.userId, userId));
  }

  async countCases(userId: string): Promise<{ count: number }[]> {
    return this.db
      .select({ count: count() })
      .from(cases)
      .where(eq(cases.userId, userId));
  }

  async getAiCredits(userId: string): Promise<{ ai_credits: number }[]> {
    return this.db
      .select({ ai_credits: users.aiCredits })
      .from(users)
      .where(eq(users.userId, userId));
  }

  async getStorage(userId: string): Promise<{ storage: number }[]> {
    return this.db
      .select({ storage: users.storage })
      .from(users)
      .where(eq(users.userId, userId));
  }

  async resetDueCredits(now: Date, nextReset: Date): Promise<{ id: string }[]> {
    return this.db
      .update(users)
      .set({ aiCredits: 0, creditsResetAt: nextReset })
      .where(or(isNull(users.creditsResetAt), lte(users.creditsResetAt, now)))
      .returning({ id: users.userId });
  }

  async incrementAiCredits(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ aiCredits: sql`${users.aiCredits} + 1` })
      .where(eq(users.userId, userId));
  }
}

export const planLimitsDrizzle = new PlanLimitsDrizzle(db);
