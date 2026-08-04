import { eq } from "drizzle-orm";
import { IntegrationsDrizzle } from "@db/classes/integrations_db";
import { outlookEmails, outlookTokens } from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("IntegrationsDrizzle (integration)", () => {
  const integrationsDb = new IntegrationsDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
  });

  describe("getOutlookConnection", () => {
    it("returns the connected flag for the user's outlook tokens", async () => {
      await testDb.insert(outlookTokens).values({
        userId: "user_1",
        accessToken: "a",
        refreshToken: "r",
        expiresIn: 3600,
        connected: true,
      });

      const rows = await integrationsDb.getOutlookConnection("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].connected).toBe(true);
    });
  });

  describe("deleteOutlookTokens", () => {
    it("deletes the user's outlook tokens", async () => {
      await testDb.insert(outlookTokens).values({
        userId: "user_1",
        accessToken: "a",
        refreshToken: "r",
        expiresIn: 3600,
      });

      await integrationsDb.deleteOutlookTokens("user_1");

      const remaining = await testDb
        .select()
        .from(outlookTokens)
        .where(eq(outlookTokens.userId, "user_1"));
      expect(remaining).toHaveLength(0);
    });
  });

  describe("deleteOutlookEmails", () => {
    it("deletes the user's outlook emails", async () => {
      await testDb.insert(outlookEmails).values({
        userId: "user_1",
        outlookId: "o1",
        conversationId: "c1",
        sentAt: new Date(),
      });

      await integrationsDb.deleteOutlookEmails("user_1");

      const remaining = await testDb
        .select()
        .from(outlookEmails)
        .where(eq(outlookEmails.userId, "user_1"));
      expect(remaining).toHaveLength(0);
    });
  });
});
