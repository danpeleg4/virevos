"use server";

import { db } from "@db/db";
import { clients, cases, users } from "@db/schema";
import { eq, count } from "drizzle-orm";
import { getUserSubscriptionByUserId } from "./workspace/billing";

const AI_CREDIT_LIMITS: Record<PlanId, number> = {
  starter: 50,
  professional: 250,
  business: 500,
};

const STORAGE_LIMIT_BYTES: Record<PlanId, number> = {
  starter: 1024 * 1024 * 1024,
  professional: 50 * 1024 * 1024 * 1024,
  business: 250 * 1024 * 1024 * 1024,
};

const PLAN_LIMITS: Record<
  PlanId,
  {
    maxClients: number | null;
    maxCases: number | null;
  }
> = {
  starter: { maxClients: 5, maxCases: 5 },
  professional: { maxClients: null, maxCases: null },
  business: { maxClients: null, maxCases: null },
};

export async function getUserPlan(userId: string): Promise<PlanId> {
  const sub = await getUserSubscriptionByUserId(userId);
  return sub.plan;
}

export async function assertCanAddClient(userId: string): Promise<void> {
  const plan = await getUserPlan(userId);
  const limit = PLAN_LIMITS[plan].maxClients;
  if (limit === null) return;

  const [result] = await db
    .select({ count: count() })
    .from(clients)
    .where(eq(clients.userId, userId));

  if (result.count >= limit) {
    throw new Error(
      `Client limit reached. The ${plan} plan allows up to ${limit} clients. Please upgrade to add more.`
    );
  }
}

export async function assertCanAddCase(userId: string): Promise<void> {
  const plan = await getUserPlan(userId);
  const limit = PLAN_LIMITS[plan].maxCases;
  if (limit === null) return;

  const [result] = await db
    .select({ count: count() })
    .from(cases)
    .where(eq(cases.userId, userId));

  if (result.count >= limit) {
    throw new Error(
      `Case limit reached. The ${plan} plan allows up to ${limit} cases. Please upgrade to add more.`
    );
  }
}

export async function assertCanUseAI(userId: string): Promise<void> {
  const plan = await getUserPlan(userId);
  const limit = AI_CREDIT_LIMITS[plan];

  const [userRow] = await db
    .select({ ai_credits: users.aiCredits })
    .from(users)
    .where(eq(users.userId, userId));

  if (!userRow || userRow.ai_credits >= limit) {
    throw new Error(
      `AI credit limit reached. The ${plan} plan allows up to ${limit} AI requests per billing cycle. Please upgrade for more.`
    );
  }
}

export async function assertCanAddFile(
  userId: string,
  fileSize: number
): Promise<void> {
  const plan = await getUserPlan(userId);
  const limitBytes = STORAGE_LIMIT_BYTES[plan];

  const [userRow] = await db
    .select({ storage: users.storage })
    .from(users)
    .where(eq(users.userId, userId));

  const currentStorage = userRow?.storage ?? 0;
  if (currentStorage + fileSize > limitBytes) {
    const limitGb = limitBytes / (1024 * 1024 * 1024);
    throw new Error(
      `Storage limit reached. The ${plan} plan includes ${limitGb}GB of storage. Please upgrade for more.`
    );
  }
}
