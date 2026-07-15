import type { PlanLimitsDB } from "@db/plan_limits_db";

export type FakePlanLimitsDb = {
  [K in keyof PlanLimitsDB]: Mock<PlanLimitsDB[K]>;
};

export function makeFakePlanLimitsDb(
  overrides: Partial<PlanLimitsDB> = {}
): FakePlanLimitsDb {
  const fake = {
    countClients: vi.fn(async (_userId: string) => [{ count: 0 }]),
    countCases: vi.fn(async (_userId: string) => [{ count: 0 }]),
    getAiCredits: vi.fn(async (_userId: string) => [{ ai_credits: 0 }]),
    getStorage: vi.fn(async (_userId: string) => [{ storage: 0 }]),
    resetDueCredits: vi.fn(async () => [{ id: "user_1" }]),
    incrementAiCredits: vi.fn(async () => {}),
  } satisfies PlanLimitsDB;

  return Object.assign(fake, overrides) as FakePlanLimitsDb;
}
