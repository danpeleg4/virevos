import { eq } from "drizzle-orm";
import { BillingDrizzle } from "@db/classes/billing_db";
import { subscriptions, users } from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("BillingDrizzle (integration)", () => {
  const billingDb = new BillingDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
  });

  async function insertSubscriptionRow(
    overrides: Partial<typeof subscriptions.$inferInsert> = {}
  ) {
    const [row] = await testDb
      .insert(subscriptions)
      .values({
        userId: "user_1",
        stripeCustomerId: "cus_1",
        ...overrides,
      })
      .returning();
    return row;
  }

  describe("getStripeCustomerId", () => {
    it("returns the user's stripe customer id", async () => {
      await insertSubscriptionRow({ stripeCustomerId: "cus_abc" });

      const [row] = await billingDb.getStripeCustomerId("user_1");

      expect(row.stripeCustomerId).toBe("cus_abc");
    });
  });

  describe("insertSubscription", () => {
    it("creates a subscription row", async () => {
      await billingDb.insertSubscription({
        userId: "user_1",
        stripeCustomerId: "cus_new",
        plan: "professional",
        status: "active",
      });

      const [row] = await testDb
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, "user_1"));
      expect(row.stripeCustomerId).toBe("cus_new");
      expect(row.plan).toBe("professional");
    });
  });

  describe("getUserCredits", () => {
    it("returns the user's ai credits and storage", async () => {
      await testDb
        .update(users)
        .set({ aiCredits: 7, storage: 2048 })
        .where(eq(users.userId, "user_1"));

      const [row] = await billingDb.getUserCredits("user_1");

      expect(row.ai_credits).toBe(7);
      expect(row.storage).toBe(2048);
    });
  });

  describe("resetAiCredits", () => {
    it("resets the user's ai credits to zero", async () => {
      await testDb
        .update(users)
        .set({ aiCredits: 7 })
        .where(eq(users.userId, "user_1"));

      await billingDb.resetAiCredits("user_1");

      const [row] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(row.aiCredits).toBe(0);
    });
  });

  describe("getUserIdRow", () => {
    it("returns the matching userId", async () => {
      const rows = await billingDb.getUserIdRow("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("user_1");
    });
  });

  describe("getSubscriptionByUserId", () => {
    it("returns the user's subscription", async () => {
      await insertSubscriptionRow();

      const rows = await billingDb.getSubscriptionByUserId("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].userId).toBe("user_1");
    });
  });

  describe("getSubscriptionOwnerByCustomerId", () => {
    it("returns the owning userId and plan for a stripe customer id", async () => {
      await insertSubscriptionRow({
        stripeCustomerId: "cus_lookup",
        plan: "business",
      });

      const [row] =
        await billingDb.getSubscriptionOwnerByCustomerId("cus_lookup");

      expect(row.userId).toBe("user_1");
      expect(row.plan).toBe("business");
    });
  });

  describe("updateSubscriptionByCustomerId", () => {
    it("updates the subscription matching the customer id", async () => {
      await insertSubscriptionRow({ stripeCustomerId: "cus_update" });

      await billingDb.updateSubscriptionByCustomerId("cus_update", {
        status: "canceled",
        cancelAtPeriodEnd: true,
      });

      const [row] = await testDb
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeCustomerId, "cus_update"));
      expect(row.status).toBe("canceled");
      expect(row.cancelAtPeriodEnd).toBe(true);
    });
  });
});
