import { eq } from "drizzle-orm";
import { PlanLimitsDrizzle } from "@db/classes/plan_limits_db";
import { cases, clients, users } from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("PlanLimitsDrizzle (integration)", () => {
  const planLimitsDb = new PlanLimitsDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
  });

  describe("countClients", () => {
    it("counts the user's clients", async () => {
      await testDb.insert(clients).values([
        { userId: "user_1", name: "A" },
        { userId: "user_1", name: "B" },
      ]);

      const [{ count }] = await planLimitsDb.countClients("user_1");

      expect(count).toBe(2);
    });
  });

  describe("countCases", () => {
    it("counts the user's cases", async () => {
      await testDb.insert(cases).values([{ userId: "user_1", name: "Case A" }]);

      const [{ count }] = await planLimitsDb.countCases("user_1");

      expect(count).toBe(1);
    });
  });

  describe("getAiCredits", () => {
    it("returns the user's ai credits", async () => {
      await testDb
        .update(users)
        .set({ aiCredits: 5 })
        .where(eq(users.userId, "user_1"));

      const [{ ai_credits }] = await planLimitsDb.getAiCredits("user_1");

      expect(ai_credits).toBe(5);
    });
  });

  describe("getStorage", () => {
    it("returns the user's storage usage", async () => {
      await testDb
        .update(users)
        .set({ storage: 1024 })
        .where(eq(users.userId, "user_1"));

      const [{ storage }] = await planLimitsDb.getStorage("user_1");

      expect(storage).toBe(1024);
    });
  });

  describe("resetDueCredits", () => {
    it("resets credits and the reset date for users whose reset date has passed", async () => {
      const past = new Date("2020-01-01");
      const nextReset = new Date("2999-01-01");
      await testDb
        .update(users)
        .set({ aiCredits: 5, creditsResetAt: past })
        .where(eq(users.userId, "user_1"));

      await planLimitsDb.resetDueCredits(new Date(), nextReset);

      const [updated] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(updated.aiCredits).toBe(0);
      expect(updated.creditsResetAt?.toISOString()).toBe(
        nextReset.toISOString()
      );
    });

    it("does not reset credits for users whose reset date is in the future", async () => {
      const future = new Date("2999-01-01");
      await testDb
        .update(users)
        .set({ aiCredits: 5, creditsResetAt: future })
        .where(eq(users.userId, "user_1"));

      const reset = await planLimitsDb.resetDueCredits(
        new Date(),
        new Date("2999-06-01")
      );

      expect(reset.map((r) => r.id)).not.toContain("user_1");
    });
  });

  describe("incrementAiCredits", () => {
    it("increments the user's ai credits by one", async () => {
      await testDb
        .update(users)
        .set({ aiCredits: 5 })
        .where(eq(users.userId, "user_1"));

      await planLimitsDb.incrementAiCredits("user_1");

      const [updated] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(updated.aiCredits).toBe(6);
    });
  });
});
