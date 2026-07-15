import type { BillingDB } from "@db/billing_db";
import type { PlanLimitsDB } from "@db/plan_limits_db";
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

export async function getUserPlan(
  userId: string,
  billingDb: BillingDB
): Promise<PlanId> {
  const sub = await getUserSubscriptionByUserId(userId, billingDb);
  return sub.plan;
}

export async function assertCanAddClient(
  userId: string,
  planLimitsDb: PlanLimitsDB,
  billingDb: BillingDB
): Promise<void> {
  const plan = await getUserPlan(userId, billingDb);
  const limit = PLAN_LIMITS[plan].maxClients;
  if (limit === null) return;

  const [result] = await planLimitsDb.countClients(userId);

  if (result.count >= limit) {
    throw new Error(
      `Client limit reached. The ${plan} plan allows up to ${limit} clients. Please upgrade to add more.`
    );
  }
}

export async function assertCanAddCase(
  userId: string,
  planLimitsDb: PlanLimitsDB,
  billingDb: BillingDB
): Promise<void> {
  const plan = await getUserPlan(userId, billingDb);
  const limit = PLAN_LIMITS[plan].maxCases;
  if (limit === null) return;

  const [result] = await planLimitsDb.countCases(userId);

  if (result.count >= limit) {
    throw new Error(
      `Case limit reached. The ${plan} plan allows up to ${limit} cases. Please upgrade to add more.`
    );
  }
}

export async function assertCanUseAI(
  userId: string,
  planLimitsDb: PlanLimitsDB,
  billingDb: BillingDB
): Promise<void> {
  const plan = await getUserPlan(userId, billingDb);
  const limit = AI_CREDIT_LIMITS[plan];

  const [userRow] = await planLimitsDb.getAiCredits(userId);

  if (!userRow || userRow.ai_credits >= limit) {
    throw new Error(
      `AI credit limit reached. The ${plan} plan allows up to ${limit} AI requests per billing cycle. Please upgrade for more.`
    );
  }
}

export async function assertCanAddFile(
  userId: string,
  fileSize: number,
  planLimitsDb: PlanLimitsDB,
  billingDb: BillingDB
): Promise<void> {
  const plan = await getUserPlan(userId, billingDb);
  const limitBytes = STORAGE_LIMIT_BYTES[plan];

  const [userRow] = await planLimitsDb.getStorage(userId);

  const currentStorage = userRow?.storage ?? 0;
  if (currentStorage + fileSize > limitBytes) {
    const limitGb = limitBytes / (1024 * 1024 * 1024);
    throw new Error(
      `Storage limit reached. The ${plan} plan includes ${limitGb}GB of storage. Please upgrade for more.`
    );
  }
}

/** Resets AI credits for every user whose reset date is due (cron). */
export async function resetDueAiCredits(
  planLimitsDb: PlanLimitsDB
): Promise<{ reset: number }> {
  const now = new Date();
  const nextReset = new Date(now);
  nextReset.setDate(nextReset.getDate() + 30);

  const result = await planLimitsDb.resetDueCredits(now, nextReset);
  return { reset: result.length };
}
