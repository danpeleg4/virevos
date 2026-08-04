import { eq } from "drizzle-orm";
import { OutlookDrizzle } from "@db/classes/outlook_db";
import {
  clients,
  outlookEmails,
  outlookSyncState,
  outlookTokens,
} from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("OutlookDrizzle (integration)", () => {
  const outlookDb = new OutlookDrizzle(testDb);

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
        outlookId: crypto.randomUUID(),
        conversationId: "c1",
        sentAt: new Date("2026-01-01"),
        ...overrides,
      })
      .returning();
    return row;
  }

  describe("getTokenByUserId", () => {
    it("returns the user's outlook token", async () => {
      await testDb.insert(outlookTokens).values({
        userId: "user_1",
        accessToken: "a",
        refreshToken: "r",
        expiresIn: 3600,
      });

      const rows = await outlookDb.getTokenByUserId("user_1");

      expect(rows).toHaveLength(1);
    });
  });

  describe("insertToken", () => {
    it("creates an outlook token row", async () => {
      await outlookDb.insertToken({
        userId: "user_1",
        accessToken: "a",
        refreshToken: "r",
        expiresIn: 3600,
      });

      const rows = await testDb
        .select()
        .from(outlookTokens)
        .where(eq(outlookTokens.userId, "user_1"));
      expect(rows).toHaveLength(1);
    });
  });

  describe("updateToken", () => {
    it("updates the token fields for the user", async () => {
      await testDb.insert(outlookTokens).values({
        userId: "user_1",
        accessToken: "old",
        refreshToken: "r",
        expiresIn: 3600,
      });

      await outlookDb.updateToken("user_1", {
        accessToken: "new",
        connected: true,
      });

      const [updated] = await testDb
        .select()
        .from(outlookTokens)
        .where(eq(outlookTokens.userId, "user_1"));
      expect(updated.accessToken).toBe("new");
      expect(updated.connected).toBe(true);
    });
  });

  describe("getEmailById", () => {
    it("returns the email scoped to the given user", async () => {
      const email = await insertEmailRow();

      const found = await outlookDb.getEmailById(email.id, "user_1");
      const notFound = await outlookDb.getEmailById(email.id, "user_2");

      expect(found).toHaveLength(1);
      expect(notFound).toHaveLength(0);
    });
  });

  describe("getEmailsForUser", () => {
    it("filters by search term across subject and sender", async () => {
      await insertEmailRow({ subject: "Invoice attached" });
      await insertEmailRow({ subject: "Unrelated" });

      const rows = await outlookDb.getEmailsForUser("user_1", {
        search: "Invoice",
        filter: "all",
        limit: 10,
        offset: 0,
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].subject).toBe("Invoice attached");
    });

    it("filters by the unread filter", async () => {
      await insertEmailRow({ isRead: false });
      await insertEmailRow({ isRead: true });

      const rows = await outlookDb.getEmailsForUser("user_1", {
        search: "",
        filter: "unread",
        limit: 10,
        offset: 0,
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].isRead).toBe(false);
    });

    it("joins in the linked client's name", async () => {
      const [client] = await testDb
        .insert(clients)
        .values({ userId: "user_1", name: "Client A" })
        .returning();
      await insertEmailRow({ clientId: client.id });

      const rows = await outlookDb.getEmailsForUser("user_1", {
        search: "",
        filter: "all",
        limit: 10,
        offset: 0,
      });

      expect(rows[0].clientName).toBe("Client A");
    });

    it("respects limit and offset", async () => {
      await insertEmailRow({ sentAt: new Date("2026-01-01") });
      await insertEmailRow({ sentAt: new Date("2026-01-02") });
      await insertEmailRow({ sentAt: new Date("2026-01-03") });

      const rows = await outlookDb.getEmailsForUser("user_1", {
        search: "",
        filter: "all",
        limit: 1,
        offset: 1,
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].sentAt.toISOString()).toBe(
        new Date("2026-01-02").toISOString()
      );
    });
  });

  describe("getExistingEmailsForUser", () => {
    it("returns all of the user's emails", async () => {
      await insertEmailRow();
      await insertEmailRow();

      const rows = await outlookDb.getExistingEmailsForUser("user_1");

      expect(rows).toHaveLength(2);
    });
  });

  describe("insertEmails", () => {
    it("bulk inserts emails", async () => {
      await outlookDb.insertEmails([
        {
          userId: "user_1",
          outlookId: "o1",
          conversationId: "c1",
          sentAt: new Date(),
        },
        {
          userId: "user_1",
          outlookId: "o2",
          conversationId: "c2",
          sentAt: new Date(),
        },
      ]);

      const rows = await testDb
        .select()
        .from(outlookEmails)
        .where(eq(outlookEmails.userId, "user_1"));
      expect(rows).toHaveLength(2);
    });

    it("does nothing when given an empty array", async () => {
      await outlookDb.insertEmails([]);

      const rows = await testDb
        .select()
        .from(outlookEmails)
        .where(eq(outlookEmails.userId, "user_1"));
      expect(rows).toHaveLength(0);
    });
  });

  describe("updateEmail", () => {
    it("updates the email's read/starred/archived flags", async () => {
      const email = await insertEmailRow();

      await outlookDb.updateEmail(email.id, { isRead: true, isStarred: true });

      const [updated] = await testDb
        .select()
        .from(outlookEmails)
        .where(eq(outlookEmails.id, email.id));
      expect(updated.isRead).toBe(true);
      expect(updated.isStarred).toBe(true);
    });
  });

  describe("deleteEmail", () => {
    it("deletes the email by id", async () => {
      const email = await insertEmailRow();

      await outlookDb.deleteEmail(email.id);

      const remaining = await testDb
        .select()
        .from(outlookEmails)
        .where(eq(outlookEmails.id, email.id));
      expect(remaining).toHaveLength(0);
    });
  });

  describe("getSyncState", () => {
    it("returns the user's sync state", async () => {
      await testDb
        .insert(outlookSyncState)
        .values({ userId: "user_1", clientState: "state-1" });

      const rows = await outlookDb.getSyncState("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].clientState).toBe("state-1");
    });
  });

  describe("findSyncStateBySubscriptionId", () => {
    it("finds the sync state by calendar or email subscription id", async () => {
      await testDb.insert(outlookSyncState).values({
        userId: "user_1",
        calendarSubscriptionId: "cal-sub-1",
      });

      const rows = await outlookDb.findSyncStateBySubscriptionId("cal-sub-1");

      expect(rows).toHaveLength(1);
    });
  });

  describe("getExpiringSyncStates", () => {
    it("returns userIds whose subscription expires at or before the threshold", async () => {
      await testDb
        .insert(outlookSyncState)
        .values({ userId: "user_1", subscriptionExpiration: 1000 });

      const rows = await outlookDb.getExpiringSyncStates(1500);

      expect(rows).toEqual([{ userId: "user_1" }]);
    });

    it("excludes states above the threshold", async () => {
      await testDb
        .insert(outlookSyncState)
        .values({ userId: "user_1", subscriptionExpiration: 5000 });

      const rows = await outlookDb.getExpiringSyncStates(1500);

      expect(rows).toEqual([]);
    });
  });

  describe("upsertDeltaLinks", () => {
    it("creates the sync state row when it does not exist", async () => {
      await outlookDb.upsertDeltaLinks("user_1", {
        calendarDeltaLink: "cal-link",
        emailDeltaLink: "email-link",
        sentEmailDeltaLink: null,
      });

      const [row] = await testDb
        .select()
        .from(outlookSyncState)
        .where(eq(outlookSyncState.userId, "user_1"));
      expect(row.calendarDeltaLink).toBe("cal-link");
    });

    it("updates the sync state row when it already exists", async () => {
      await testDb
        .insert(outlookSyncState)
        .values({ userId: "user_1", calendarDeltaLink: "old-link" });

      await outlookDb.upsertDeltaLinks("user_1", {
        calendarDeltaLink: "new-link",
        emailDeltaLink: null,
        sentEmailDeltaLink: null,
      });

      const rows = await testDb
        .select()
        .from(outlookSyncState)
        .where(eq(outlookSyncState.userId, "user_1"));
      expect(rows).toHaveLength(1);
      expect(rows[0].calendarDeltaLink).toBe("new-link");
    });
  });

  describe("updateDeltaLinks", () => {
    it("updates the delta links for an existing sync state", async () => {
      await testDb.insert(outlookSyncState).values({ userId: "user_1" });

      await outlookDb.updateDeltaLinks("user_1", {
        calendarDeltaLink: "cal-link",
        emailDeltaLink: "email-link",
        sentEmailDeltaLink: "sent-link",
      });

      const [row] = await testDb
        .select()
        .from(outlookSyncState)
        .where(eq(outlookSyncState.userId, "user_1"));
      expect(row.emailDeltaLink).toBe("email-link");
      expect(row.sentEmailDeltaLink).toBe("sent-link");
    });
  });

  describe("upsertSubscriptions", () => {
    it("creates the sync state row when it does not exist", async () => {
      await outlookDb.upsertSubscriptions("user_1", {
        calendarSubscriptionId: "cal-sub",
        emailSubscriptionId: "email-sub",
        clientState: "state",
        subscriptionExpiration: 1000,
      });

      const [row] = await testDb
        .select()
        .from(outlookSyncState)
        .where(eq(outlookSyncState.userId, "user_1"));
      expect(row.calendarSubscriptionId).toBe("cal-sub");
    });

    it("updates the sync state row when it already exists", async () => {
      await testDb.insert(outlookSyncState).values({
        userId: "user_1",
        calendarSubscriptionId: "old-sub",
      });

      await outlookDb.upsertSubscriptions("user_1", {
        calendarSubscriptionId: "new-sub",
        emailSubscriptionId: null,
        clientState: "state",
        subscriptionExpiration: 2000,
      });

      const rows = await testDb
        .select()
        .from(outlookSyncState)
        .where(eq(outlookSyncState.userId, "user_1"));
      expect(rows).toHaveLength(1);
      expect(rows[0].calendarSubscriptionId).toBe("new-sub");
    });
  });

  describe("updateSubscriptionExpiration", () => {
    it("updates the subscription expiration for the user", async () => {
      await testDb
        .insert(outlookSyncState)
        .values({ userId: "user_1", subscriptionExpiration: 1000 });

      await outlookDb.updateSubscriptionExpiration("user_1", 9999);

      const [row] = await testDb
        .select()
        .from(outlookSyncState)
        .where(eq(outlookSyncState.userId, "user_1"));
      expect(row.subscriptionExpiration).toBe(9999);
    });
  });
});
