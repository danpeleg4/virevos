import { eq } from "drizzle-orm";
import { ScheduledEmailsDrizzle } from "@db/classes/scheduled_emails_db";
import { clients, outlookEmails, scheduledEmails, users } from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("ScheduledEmailsDrizzle (integration)", () => {
  const scheduledEmailsDb = new ScheduledEmailsDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
  });

  async function insertScheduledEmailRow(
    overrides: Partial<typeof scheduledEmails.$inferInsert> = {}
  ) {
    const [row] = await testDb
      .insert(scheduledEmails)
      .values({
        userId: "user_1",
        toEmail: "to@x.com",
        subject: "Subject",
        bodyHtml: "<p>Body</p>",
        scheduledAt: new Date("2026-01-01T10:00:00Z"),
        ...overrides,
      })
      .returning();
    return row;
  }

  describe("getScheduledEmailsByUser", () => {
    it("returns the user's scheduled emails ordered by scheduledAt", async () => {
      await insertScheduledEmailRow({
        subject: "Later",
        scheduledAt: new Date("2026-02-01"),
      });
      await insertScheduledEmailRow({
        subject: "Earlier",
        scheduledAt: new Date("2026-01-01"),
      });

      const rows = await scheduledEmailsDb.getScheduledEmailsByUser("user_1");

      expect(rows.map((r) => r.subject)).toEqual(["Earlier", "Later"]);
    });
  });

  describe("getDueScheduledEmailIds", () => {
    it("returns ids of pending emails scheduled at or before now", async () => {
      const due = await insertScheduledEmailRow({
        status: "pending",
        scheduledAt: new Date("2020-01-01"),
      });
      await insertScheduledEmailRow({
        status: "pending",
        scheduledAt: new Date("2999-01-01"),
      });
      await insertScheduledEmailRow({
        status: "sent",
        scheduledAt: new Date("2020-01-01"),
      });

      const rows = await scheduledEmailsDb.getDueScheduledEmailIds();

      expect(rows.map((r) => r.id)).toEqual([due.id]);
    });
  });

  describe("claimEmail", () => {
    it("marks a pending email as sent and returns it", async () => {
      const email = await insertScheduledEmailRow({ status: "pending" });

      const claimed = await scheduledEmailsDb.claimEmail(email.id);

      expect(claimed).toHaveLength(1);
      expect(claimed[0].status).toBe("sent");
      expect(claimed[0].sentAt).not.toBeNull();
    });

    it("does not claim an email that is not pending", async () => {
      const email = await insertScheduledEmailRow({ status: "failed" });

      const claimed = await scheduledEmailsDb.claimEmail(email.id);

      expect(claimed).toHaveLength(0);
    });
  });

  describe("unclaimEmail", () => {
    it("reverts the email back to pending", async () => {
      const email = await insertScheduledEmailRow({
        status: "sent",
        sentAt: new Date(),
      });

      await scheduledEmailsDb.unclaimEmail(email.id);

      const [updated] = await testDb
        .select()
        .from(scheduledEmails)
        .where(eq(scheduledEmails.id, email.id));
      expect(updated.status).toBe("pending");
      expect(updated.sentAt).toBeNull();
    });
  });

  describe("markAsFailed", () => {
    it("marks the email as failed with an error message", async () => {
      const email = await insertScheduledEmailRow();

      await scheduledEmailsDb.markAsFailed(email.id);

      const [updated] = await testDb
        .select()
        .from(scheduledEmails)
        .where(eq(scheduledEmails.id, email.id));
      expect(updated.status).toBe("failed");
      expect(updated.errorMessage).toBe("Outlook not connected for user");
    });
  });

  describe("getUserRows", () => {
    it("returns the user's name and email", async () => {
      await testDb
        .update(users)
        .set({ name: "Jane" })
        .where(eq(users.userId, "user_1"));

      const [row] = await scheduledEmailsDb.getUserRows("user_1");

      expect(row.name).toBe("Jane");
      expect(row.email).toBe("user_1@example.com");
    });
  });

  describe("getAllClients", () => {
    it("returns the user's clients with id and email", async () => {
      await testDb
        .insert(clients)
        .values({ userId: "user_1", name: "Client A", email: "a@x.com" });

      const rows = await scheduledEmailsDb.getAllClients("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].email).toBe("a@x.com");
    });
  });

  describe("insertOutlookEmail", () => {
    it("creates an outlook email row derived from the scheduled email", async () => {
      const email = await insertScheduledEmailRow({
        subject: "Hello",
        bodyText: "Plain body",
      });

      await scheduledEmailsDb.insertOutlookEmail(
        "outlook-1",
        "conv-1",
        email,
        "from@x.com",
        "From Name",
        null,
        "user_1"
      );

      const rows = await testDb
        .select()
        .from(outlookEmails)
        .where(eq(outlookEmails.outlookId, "outlook-1"));
      expect(rows).toHaveLength(1);
      expect(rows[0].subject).toBe("Hello");
      expect(rows[0].isSent).toBe(true);
      expect(rows[0].toEmails).toEqual([email.toEmail]);
    });
  });

  describe("insertScheduledEmail", () => {
    it("creates a scheduled email row", async () => {
      const created = await scheduledEmailsDb.insertScheduledEmail({
        toEmail: "new@x.com",
        toName: null,
        subject: "New Email",
        bodyHtml: "<p>Hi</p>",
        bodyText: null,
        scheduledAt: new Date("2026-03-01"),
        timezone: "UTC",
        recurring: null,
        status: "pending",
        attachments: null,
        clientId: null,
        userId: "user_1",
      });

      expect(created.subject).toBe("New Email");
      expect(created.toEmail).toBe("new@x.com");
    });
  });

  describe("catchFailedInsertOutlookEmail", () => {
    it("marks the scheduled email as failed with the given error", async () => {
      const email = await insertScheduledEmailRow();

      await scheduledEmailsDb.catchFailedInsertOutlookEmail(
        "SMTP timeout",
        email.id
      );

      const [updated] = await testDb
        .select()
        .from(scheduledEmails)
        .where(eq(scheduledEmails.id, email.id));
      expect(updated.status).toBe("failed");
      expect(updated.errorMessage).toBe("SMTP timeout");
    });
  });

  describe("getScheduledEmailById", () => {
    it("returns the id scoped to the given user", async () => {
      const email = await insertScheduledEmailRow();

      const found = await scheduledEmailsDb.getScheduledEmailById(
        email.id,
        "user_1"
      );
      const notFound = await scheduledEmailsDb.getScheduledEmailById(
        email.id,
        "user_2"
      );

      expect(found).toHaveLength(1);
      expect(notFound).toHaveLength(0);
    });
  });

  describe("deleteScheduledEmailById", () => {
    it("deletes a non-sent email scoped to the user", async () => {
      const email = await insertScheduledEmailRow({ status: "pending" });

      const deleted = await scheduledEmailsDb.deleteScheduledEmailById(
        email.id,
        "user_1"
      );

      expect(deleted).toHaveLength(1);
      const remaining = await testDb
        .select()
        .from(scheduledEmails)
        .where(eq(scheduledEmails.id, email.id));
      expect(remaining).toHaveLength(0);
    });

    it("does not delete an email that has already been sent", async () => {
      const email = await insertScheduledEmailRow({ status: "sent" });

      const deleted = await scheduledEmailsDb.deleteScheduledEmailById(
        email.id,
        "user_1"
      );

      expect(deleted).toHaveLength(0);
      const remaining = await testDb
        .select()
        .from(scheduledEmails)
        .where(eq(scheduledEmails.id, email.id));
      expect(remaining).toHaveLength(1);
    });
  });
});
