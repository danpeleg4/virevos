"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { clients } from "@db/schema";
import { eq, count } from "drizzle-orm";
import { getUserSubscriptionByUserId } from "./billing";

const PLAN_LIMITS = {
  starter: { maxClients: 5, maxProjects: 1, aiAssistant: false },
  professional: { maxClients: null, maxProjects: null, aiAssistant: true },
  business: { maxClients: null, maxProjects: null, aiAssistant: true },
} as const;

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

export async function assertCanAddProject(userId: string): Promise<void> {
  const plan = await getUserPlan(userId);
  const limit = PLAN_LIMITS[plan].maxProjects;
  if (limit === null) return;

  throw new Error(
    `Project limit reached. The ${plan} plan allows up to ${limit} project. Please upgrade to add more.`
  );
}

export async function assertHasAiAssistant(userId: string): Promise<void> {
  const plan = await getUserPlan(userId);
  if (!PLAN_LIMITS[plan].aiAssistant) {
    throw new Error(
      `The AI assistant is not available on the ${plan} plan. Please upgrade to Professional or Business.`
    );
  }
}

export async function getCurrentUserPlan(): Promise<PlanId> {
  const user = await currentUser();
  if (!user?.id) throw new Error("Unauthorized");
  return getUserPlan(user.id);
}
