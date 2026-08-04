import { EmailsDrizzle } from "@db/classes/emails_db";
import { outlookEmails } from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("EmailsDrizzle (integration)", () => {
  const emailsDb = new EmailsDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
  });

  async function insertEmailRow(
    overrides: Partial<typeof outlookEmails.$inferInsert> = {}
  ) {
    const [row] = await testDb
      .insert(outlookEmails)
      .values({
        userId: "user_1",
        outlookId: "o1",
        conversationId: "c1",
        sentAt: new Date("2026-01-01"),
        ...overrides,
      })
      .returning();
    return row;
  }

  describe("getEmailsByOutlookIds", () => {
    it("returns emails matching the given outlook ids", async () => {
      await insertEmailRow({ outlookId: "keep-1", subject: "Keep" });
      await insertEmailRow({ outlookId: "skip-1", subject: "Skip" });

      const rows = await emailsDb.getEmailsByOutlookIds("user_1", ["keep-1"]);

      expect(rows).toHaveLength(1);
      expect(rows[0].subject).toBe("Keep");
    });

    it("returns an empty array when given no outlook ids", async () => {
      const rows = await emailsDb.getEmailsByOutlookIds("user_1", []);

      expect(rows).toEqual([]);
    });
  });

  describe("getRecentUnsentEmails", () => {
    it("returns unsent emails ordered by most recent, limited", async () => {
      await insertEmailRow({
        outlookId: "o-old",
        isSent: false,
        sentAt: new Date("2026-01-01"),
      });
      await insertEmailRow({
        outlookId: "o-new",
        isSent: false,
        sentAt: new Date("2026-02-01"),
      });
      await insertEmailRow({
        outlookId: "o-sent",
        isSent: true,
        sentAt: new Date("2026-03-01"),
      });

      const rows = await emailsDb.getRecentUnsentEmails("user_1", 10);

      expect(rows.map((r) => r.outlookId)).toEqual(["o-new", "o-old"]);
    });

    it("respects the limit", async () => {
      await insertEmailRow({ outlookId: "o1", isSent: false });
      await insertEmailRow({ outlookId: "o2", isSent: false });

      const rows = await emailsDb.getRecentUnsentEmails("user_1", 1);

      expect(rows).toHaveLength(1);
    });
  });
});
