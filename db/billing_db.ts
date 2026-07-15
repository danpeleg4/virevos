import { db, type DrizzleDB } from "./db";
import { subscriptions, users } from "./schema";
import { eq } from "drizzle-orm";

export type SubscriptionRow = typeof subscriptions.$inferSelect;

export type SubscriptionUpdateData = Partial<
  Pick<
    typeof subscriptions.$inferInsert,
    | "stripeSubscriptionId"
    | "stripePriceId"
    | "plan"
    | "status"
    | "currentPeriodEnd"
    | "cancelAtPeriodEnd"
    | "updatedAt"
  >
>;

export interface BillingDB {
  getStripeCustomerId(userId: string): Promise<{ stripeCustomerId: string }[]>;
  insertSubscription(values: {
    userId: string;
    stripeCustomerId: string;
    plan: string;
    status: string;
  }): Promise<void>;
  getUserCredits(
    userId: string
  ): Promise<{ ai_credits: number; storage: number }[]>;
  resetAiCredits(userId: string): Promise<void>;
  getUserIdRow(userId: string): Promise<{ id: string }[]>;
  getSubscriptionByUserId(userId: string): Promise<SubscriptionRow[]>;
  getSubscriptionOwnerByCustomerId(
    customerId: string
  ): Promise<{ userId: string; plan: string }[]>;
  updateSubscriptionByCustomerId(
    customerId: string,
    data: SubscriptionUpdateData
  ): Promise<void>;
}

export class BillingDrizzle implements BillingDB {
  constructor(private readonly db: DrizzleDB) {}

  async getStripeCustomerId(
    userId: string
  ): Promise<{ stripeCustomerId: string }[]> {
    return this.db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
  }

  async insertSubscription(values: {
    userId: string;
    stripeCustomerId: string;
    plan: string;
    status: string;
  }): Promise<void> {
    await this.db.insert(subscriptions).values(values);
  }

  async getUserCredits(
    userId: string
  ): Promise<{ ai_credits: number; storage: number }[]> {
    return this.db
      .select({ ai_credits: users.aiCredits, storage: users.storage })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
  }

  async resetAiCredits(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ aiCredits: 0 })
      .where(eq(users.userId, userId));
  }

  async getUserIdRow(userId: string): Promise<{ id: string }[]> {
    return this.db
      .select({ id: users.userId })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
  }

  async getSubscriptionByUserId(userId: string): Promise<SubscriptionRow[]> {
    return this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
  }

  async getSubscriptionOwnerByCustomerId(
    customerId: string
  ): Promise<{ userId: string; plan: string }[]> {
    return this.db
      .select({ userId: subscriptions.userId, plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, customerId))
      .limit(1);
  }

  async updateSubscriptionByCustomerId(
    customerId: string,
    data: SubscriptionUpdateData
  ): Promise<void> {
    await this.db
      .update(subscriptions)
      .set(data)
      .where(eq(subscriptions.stripeCustomerId, customerId));
  }
}

export const billingDrizzle = new BillingDrizzle(db);
