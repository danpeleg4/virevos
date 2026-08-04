import { eq } from "drizzle-orm";
import { CalendarDrizzle } from "@db/classes/calendar_db";
import { events, meetingAttendees } from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("CalendarDrizzle (integration)", () => {
  const calendarDb = new CalendarDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
    await seedUser("user_2");
  });

  async function insertEventRow(
    overrides: Partial<typeof events.$inferInsert> = {}
  ) {
    const [row] = await testDb
      .insert(events)
      .values({
        id: crypto.randomUUID(),
        userId: "user_1",
        title: "Test Event",
        dateTime: new Date("2026-01-01T10:00:00Z"),
        duration: 30,
        ...overrides,
      })
      .returning();
    return row;
  }

  describe("getEventsWithAttendees", () => {
    it("returns the user's events joined with their attendees", async () => {
      const event = await insertEventRow();
      await testDb
        .insert(meetingAttendees)
        .values({ meetingId: event.id, name: "Alice", initials: "A" });

      const rows = await calendarDb.getEventsWithAttendees("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].attendees).toHaveLength(1);
      expect(rows[0].attendees[0].name).toBe("Alice");
    });
  });

  describe("getEventByIdUnscoped", () => {
    it("returns the event regardless of owner", async () => {
      const event = await insertEventRow({ userId: "user_2" });

      const rows = await calendarDb.getEventByIdUnscoped(event.id);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(event.id);
    });
  });

  describe("getEventById", () => {
    it("returns the event scoped to the given user", async () => {
      const event = await insertEventRow();

      const found = await calendarDb.getEventById(event.id, "user_1");
      const notFound = await calendarDb.getEventById(event.id, "user_2");

      expect(found).toHaveLength(1);
      expect(notFound).toHaveLength(0);
    });
  });

  describe("getEventByTitle", () => {
    it("finds an event by title, case-insensitively", async () => {
      await insertEventRow({ title: "Standup" });

      const found = await calendarDb.getEventByTitle("user_1", "standup");

      expect(found).toHaveLength(1);
    });
  });

  describe("insertEvent", () => {
    it("creates an event row and returns it", async () => {
      const created = await calendarDb.insertEvent({
        id: crypto.randomUUID(),
        userId: "user_1",
        title: "New Event",
        dateTime: new Date("2026-01-01T10:00:00Z"),
        duration: 45,
      });

      expect(created.title).toBe("New Event");
      expect(created.duration).toBe(45);
    });
  });

  describe("updateEvent", () => {
    it("updates only the given fields, scoped to the user", async () => {
      const event = await insertEventRow({ title: "Old Title" });

      await calendarDb.updateEvent(event.id, "user_1", { title: "New Title" });

      const [updated] = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(updated.title).toBe("New Title");
    });

    it("does not update an event belonging to a different user", async () => {
      const event = await insertEventRow({
        userId: "user_2",
        title: "Untouchable",
      });

      await calendarDb.updateEvent(event.id, "user_1", { title: "Hacked" });

      const [unchanged] = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(unchanged.title).toBe("Untouchable");
    });
  });

  describe("deleteEvent", () => {
    it("deletes an event scoped to the given user", async () => {
      const event = await insertEventRow();

      await calendarDb.deleteEvent(event.id, "user_1");

      const remaining = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(remaining).toHaveLength(0);
    });

    it("does not delete an event belonging to a different user", async () => {
      const event = await insertEventRow({ userId: "user_2" });

      await calendarDb.deleteEvent(event.id, "user_1");

      const remaining = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(remaining).toHaveLength(1);
    });
  });

  describe("getEventsForUser", () => {
    it("returns all events for the user, unjoined", async () => {
      await insertEventRow();
      await insertEventRow();

      const rows = await calendarDb.getEventsForUser("user_1");

      expect(rows).toHaveLength(2);
    });
  });

  describe("insertEvents", () => {
    it("bulk inserts events", async () => {
      await calendarDb.insertEvents([
        {
          id: crypto.randomUUID(),
          userId: "user_1",
          title: "Bulk 1",
          dateTime: new Date("2026-01-01T10:00:00Z"),
          duration: 15,
        },
        {
          id: crypto.randomUUID(),
          userId: "user_1",
          title: "Bulk 2",
          dateTime: new Date("2026-01-02T10:00:00Z"),
          duration: 15,
        },
      ]);

      const rows = await testDb
        .select()
        .from(events)
        .where(eq(events.userId, "user_1"));
      expect(rows).toHaveLength(2);
    });

    it("does nothing when given an empty array", async () => {
      await calendarDb.insertEvents([]);

      const rows = await testDb
        .select()
        .from(events)
        .where(eq(events.userId, "user_1"));
      expect(rows).toHaveLength(0);
    });
  });

  describe("deleteEventByOutlookEventId", () => {
    it("deletes the event matching the outlook event id, scoped to the user", async () => {
      const event = await insertEventRow({ outlookEventId: "outlook-1" });

      await calendarDb.deleteEventByOutlookEventId("outlook-1", "user_1");

      const remaining = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(remaining).toHaveLength(0);
    });

    it("does not delete an event belonging to a different user", async () => {
      const event = await insertEventRow({
        userId: "user_2",
        outlookEventId: "outlook-1",
      });

      await calendarDb.deleteEventByOutlookEventId("outlook-1", "user_1");

      const remaining = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(remaining).toHaveLength(1);
    });
  });
});
