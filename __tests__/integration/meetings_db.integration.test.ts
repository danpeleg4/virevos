import { eq } from "drizzle-orm";
import { MeetingsDrizzle } from "@db/classes/meetings_db";
import {
  clients,
  documentRequestItems,
  events,
  meetingAttendees,
  meetingDocumentRequests,
  meetingTranscripts,
  users,
} from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("MeetingsDrizzle (integration)", () => {
  const meetingsDb = new MeetingsDrizzle(testDb);

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
        title: "Test Meeting",
        dateTime: new Date("2026-01-01T10:00:00Z"),
        duration: 30,
        ...overrides,
      })
      .returning();
    return row;
  }

  describe("setEventStatus", () => {
    it("updates the event status, scoped to the user", async () => {
      const event = await insertEventRow();

      await meetingsDb.setEventStatus(event.id, "user_1", "completed");

      const [updated] = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(updated.status).toBe("completed");
    });

    it("does not update an event belonging to a different user", async () => {
      const event = await insertEventRow({ userId: "user_2" });

      await meetingsDb.setEventStatus(event.id, "user_1", "completed");

      const [unchanged] = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(unchanged.status).not.toBe("completed");
    });
  });

  describe("insertEvent", () => {
    it("creates an event row", async () => {
      const id = crypto.randomUUID();

      await meetingsDb.insertEvent({
        id,
        userId: "user_1",
        title: "New Meeting",
        dateTime: new Date("2026-01-01T10:00:00Z"),
        duration: 60,
      });

      const [row] = await testDb.select().from(events).where(eq(events.id, id));
      expect(row.title).toBe("New Meeting");
    });
  });

  describe("getActionItems", () => {
    it("returns the event's action items", async () => {
      const actionItems = [
        { task: "Follow up", owner: "Jane", dueDate: null, completed: false },
      ];
      const event = await insertEventRow({ actionItems });

      const [row] = await meetingsDb.getActionItems(event.id, "user_1");

      expect(row.actionItems).toEqual(actionItems);
    });
  });

  describe("setActionItems", () => {
    it("updates the event's action items, scoped to the user", async () => {
      const event = await insertEventRow();
      const actionItems = [
        { task: "Send report", owner: "Bob", dueDate: null, completed: true },
      ];

      await meetingsDb.setActionItems(event.id, "user_1", actionItems);

      const [updated] = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(updated.actionItems).toEqual(actionItems);
    });
  });

  describe("getLatestMeeting", () => {
    it("returns the most recently created meeting for the user", async () => {
      await insertEventRow({ isMeeting: true, title: "Older" });
      await new Promise((r) => setTimeout(r, 10));
      const newer = await insertEventRow({ isMeeting: true, title: "Newer" });
      await insertEventRow({ isMeeting: false, title: "Not A Meeting" });

      const [latest] = await meetingsDb.getLatestMeeting("user_1");

      expect(latest.id).toBe(newer.id);
    });
  });

  describe("getEventIdForUser", () => {
    it("returns the event id scoped to the user", async () => {
      const event = await insertEventRow();

      const found = await meetingsDb.getEventIdForUser(event.id, "user_1");
      const notFound = await meetingsDb.getEventIdForUser(event.id, "user_2");

      expect(found).toHaveLength(1);
      expect(notFound).toHaveLength(0);
    });
  });

  describe("getMeetingStartTime", () => {
    it("returns the meeting start epoch, scoped to the user", async () => {
      const event = await insertEventRow({ meetingStartTimeEpoch: 12345 });

      const [row] = await meetingsDb.getMeetingStartTime(event.id, "user_1");

      expect(row.meetingStartTimeEpoch).toBe(12345);
    });
  });

  describe("getTranscriptChunks", () => {
    it("returns transcript chunks ordered by creation time", async () => {
      const event = await insertEventRow();
      await testDb.insert(meetingTranscripts).values({
        meetingId: event.id,
        speakerIdentity: "Alice",
        text: "Hello",
      });
      await testDb.insert(meetingTranscripts).values({
        meetingId: event.id,
        speakerIdentity: "Bob",
        text: "Hi",
      });

      const rows = await meetingsDb.getTranscriptChunks(event.id);

      expect(rows).toHaveLength(2);
      expect(rows[0].speaker).toBe("Alice");
    });
  });

  describe("getEventByIdUnscoped", () => {
    it("returns the event regardless of owner", async () => {
      const event = await insertEventRow({ userId: "user_2" });

      const rows = await meetingsDb.getEventByIdUnscoped(event.id);

      expect(rows).toHaveLength(1);
    });
  });

  describe("setRoomStatus", () => {
    it("sets the status of the event matching the room name", async () => {
      const event = await insertEventRow();

      await meetingsDb.setRoomStatus(event.id, "active");

      const [updated] = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(updated.status).toBe("active");
    });
  });

  describe("getMeetingOwnerWithRecordingStatus", () => {
    it("returns the owner's userId and recordingStatus", async () => {
      await testDb
        .update(users)
        .set({ recordingStatus: false })
        .where(eq(users.userId, "user_1"));
      const event = await insertEventRow();

      const [row] = await meetingsDb.getMeetingOwnerWithRecordingStatus(
        event.id
      );

      expect(row.userId).toBe("user_1");
      expect(row.recordingStatus).toBe(false);
    });
  });

  describe("setMeetingStartEpoch", () => {
    it("sets the meeting start epoch on the event", async () => {
      const event = await insertEventRow();

      await meetingsDb.setMeetingStartEpoch(event.id, 99999);

      const [updated] = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(updated.meetingStartTimeEpoch).toBe(99999);
    });
  });

  describe("markRoomFinished", () => {
    it("sets duration, link and status to ended", async () => {
      const event = await insertEventRow();

      await meetingsDb.markRoomFinished(event.id, 42);

      const [updated] = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(updated.duration).toBe(42);
      expect(updated.status).toBe("ended");
      expect(updated.link).toBe("Meeting ended.");
    });
  });

  describe("getTranscriptChunksFull", () => {
    it("returns full transcript rows ordered by creation time", async () => {
      const event = await insertEventRow();
      await testDb.insert(meetingTranscripts).values({
        meetingId: event.id,
        speakerIdentity: "Alice",
        text: "Hello",
      });

      const rows = await meetingsDb.getTranscriptChunksFull(event.id);

      expect(rows).toHaveLength(1);
      expect(rows[0].text).toBe("Hello");
    });
  });

  describe("getMeetingOwner", () => {
    it("returns the userId owning the room", async () => {
      const event = await insertEventRow();

      const [row] = await meetingsDb.getMeetingOwner(event.id);

      expect(row.userId).toBe("user_1");
    });
  });

  describe("getClientsForUser", () => {
    it("returns the user's clients", async () => {
      await testDb
        .insert(clients)
        .values({ userId: "user_1", name: "Client A", email: "a@x.com" });

      const rows = await meetingsDb.getClientsForUser("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("Client A");
    });
  });

  describe("updateMeetingAnalysis", () => {
    it("updates the event with the given analysis fields", async () => {
      const event = await insertEventRow();

      await meetingsDb.updateMeetingAnalysis(event.id, {
        aiSummary: "Summary text",
        key_points: ["Point 1"],
        hasNotes: true,
      });

      const [updated] = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(updated.aiSummary).toBe("Summary text");
      expect(updated.key_points).toEqual(["Point 1"]);
      expect(updated.hasNotes).toBe(true);
    });
  });

  describe("insertDocumentRequestWithItems", () => {
    it("creates a document request and its items", async () => {
      const [client] = await testDb
        .insert(clients)
        .values({ userId: "user_1", name: "Client A" })
        .returning();
      const event = await insertEventRow();

      await meetingsDb.insertDocumentRequestWithItems(
        event.id,
        client.id,
        "user_1",
        [
          { name: "ID Card", description: null },
          { name: "Proof of Address", description: "Utility bill" },
        ]
      );

      const [request] = await testDb
        .select()
        .from(meetingDocumentRequests)
        .where(eq(meetingDocumentRequests.eventId, event.id));
      const items = await testDb
        .select()
        .from(documentRequestItems)
        .where(eq(documentRequestItems.requestId, request.id));

      expect(request.status).toBe("pending_approval");
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.name)).toEqual(["ID Card", "Proof of Address"]);
    });
  });

  describe("incrementAiCredits", () => {
    it("increments the user's ai credits by one", async () => {
      await testDb
        .update(users)
        .set({ aiCredits: 2 })
        .where(eq(users.userId, "user_1"));

      await meetingsDb.incrementAiCredits("user_1");

      const [updated] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(updated.aiCredits).toBe(3);
    });
  });

  describe("creditRecordingStorage", () => {
    it("sets the recording size and credits user storage once", async () => {
      await testDb
        .update(users)
        .set({ storage: 100 })
        .where(eq(users.userId, "user_1"));
      const event = await insertEventRow();

      await meetingsDb.creditRecordingStorage(event.id, 50);

      const [updatedEvent] = await testDb
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(updatedEvent.recordingSize).toBe(50);
      expect(user.storage).toBe(150);
    });

    it("does not double-credit storage on a second call", async () => {
      await testDb
        .update(users)
        .set({ storage: 100 })
        .where(eq(users.userId, "user_1"));
      const event = await insertEventRow();

      await meetingsDb.creditRecordingStorage(event.id, 50);
      await meetingsDb.creditRecordingStorage(event.id, 50);

      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(user.storage).toBe(150);
    });
  });

  describe("insertAttendee", () => {
    it("creates an attendee row", async () => {
      const event = await insertEventRow();

      await meetingsDb.insertAttendee(event.id, "Alice");

      const rows = await testDb
        .select()
        .from(meetingAttendees)
        .where(eq(meetingAttendees.meetingId, event.id));
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("Alice");
      expect(rows[0].initials).toBe("A");
    });

    it("does not duplicate an attendee with the same name on the same meeting", async () => {
      const event = await insertEventRow();

      await meetingsDb.insertAttendee(event.id, "Alice");
      await meetingsDb.insertAttendee(event.id, "Alice");

      const rows = await testDb
        .select()
        .from(meetingAttendees)
        .where(eq(meetingAttendees.meetingId, event.id));
      expect(rows).toHaveLength(1);
    });
  });
});
