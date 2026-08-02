import { db, type DrizzleDB } from "../db";
import {
  clients,
  documentRequestItems,
  events,
  meetingAttendees,
  meetingDocumentRequests,
  meetingTranscripts,
  users,
} from "../schema";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type TranscriptChunkRow = typeof meetingTranscripts.$inferSelect;

export type ActionItem = NonNullable<EventRow["actionItems"]>[number];

export type MeetingAnalysisData = {
  aiSummary?: string;
  key_points?: string[];
  actionItems?: ActionItem[];
  tags?: string[];
  hasTranscript?: boolean;
  hasNotes?: boolean;
  clientId?: number;
};

export interface MeetingsDB {
  setEventStatus(
    eventId: string,
    userId: string,
    status: string
  ): Promise<void>;
  insertEvent(values: NewEventRow): Promise<void>;
  getActionItems(
    eventId: string,
    userId: string
  ): Promise<{ actionItems: ActionItem[] | null }[]>;
  setActionItems(
    eventId: string,
    userId: string,
    actionItems: ActionItem[]
  ): Promise<void>;
  getLatestMeeting(userId: string): Promise<EventRow[]>;
  getEventIdForUser(eventId: string, userId: string): Promise<{ id: string }[]>;
  getMeetingStartTime(
    eventId: string,
    userId: string
  ): Promise<{ id: string; meetingStartTimeEpoch: number | null }[]>;
  getTranscriptChunks(
    meetingId: string
  ): Promise<{ speaker: string; text: string; createdAt: Date | null }[]>;
  getEventByIdUnscoped(eventId: string): Promise<EventRow[]>;
  // ── LiveKit webhook operations ──
  setRoomStatus(roomName: string, status: string): Promise<void>;
  getMeetingOwnerWithRecordingStatus(
    roomName: string
  ): Promise<{ userId: string; recordingStatus: boolean }[]>;
  setMeetingStartEpoch(roomName: string, epochSeconds: number): Promise<void>;
  markRoomFinished(roomName: string, durationMinutes: number): Promise<void>;
  getTranscriptChunksFull(roomName: string): Promise<TranscriptChunkRow[]>;
  getMeetingOwner(roomName: string): Promise<{ userId: string }[]>;
  getClientsForUser(
    userId: string
  ): Promise<{ id: number; name: string; email: string | null }[]>;
  updateMeetingAnalysis(
    roomName: string,
    data: MeetingAnalysisData
  ): Promise<void>;
  insertDocumentRequestWithItems(
    roomName: string,
    clientId: number | null,
    userId: string,
    items: { name: string; description: string | null }[]
  ): Promise<void>;
  incrementAiCredits(userId: string): Promise<void>;
  /** Records the recording size once and credits user storage atomically. */
  creditRecordingStorage(roomName: string, totalSize: number): Promise<void>;
  insertAttendee(meetingId: string, name: string): Promise<void>;
}

export class MeetingsDrizzle implements MeetingsDB {
  constructor(private readonly db: DrizzleDB) {}

  async setEventStatus(
    eventId: string,
    userId: string,
    status: string
  ): Promise<void> {
    await this.db
      .update(events)
      .set({ status })
      .where(and(eq(events.id, eventId), eq(events.userId, userId)));
  }

  async insertEvent(values: NewEventRow): Promise<void> {
    await this.db.insert(events).values(values);
  }

  async getActionItems(
    eventId: string,
    userId: string
  ): Promise<{ actionItems: ActionItem[] | null }[]> {
    return this.db
      .select({ actionItems: events.actionItems })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.userId, userId)));
  }

  async setActionItems(
    eventId: string,
    userId: string,
    actionItems: ActionItem[]
  ): Promise<void> {
    await this.db
      .update(events)
      .set({ actionItems })
      .where(and(eq(events.id, eventId), eq(events.userId, userId)));
  }

  async getLatestMeeting(userId: string): Promise<EventRow[]> {
    return this.db
      .select()
      .from(events)
      .where(and(eq(events.userId, userId), eq(events.isMeeting, true)))
      .orderBy(desc(events.createdAt))
      .limit(1);
  }

  async getEventIdForUser(
    eventId: string,
    userId: string
  ): Promise<{ id: string }[]> {
    return this.db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.userId, userId)));
  }

  async getMeetingStartTime(
    eventId: string,
    userId: string
  ): Promise<{ id: string; meetingStartTimeEpoch: number | null }[]> {
    return this.db
      .select({
        id: events.id,
        meetingStartTimeEpoch: events.meetingStartTimeEpoch,
      })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.userId, userId)));
  }

  async getTranscriptChunks(
    meetingId: string
  ): Promise<{ speaker: string; text: string; createdAt: Date | null }[]> {
    return this.db
      .select({
        speaker: meetingTranscripts.speakerIdentity,
        text: meetingTranscripts.text,
        createdAt: meetingTranscripts.createdAt,
      })
      .from(meetingTranscripts)
      .where(eq(meetingTranscripts.meetingId, meetingId))
      .orderBy(asc(meetingTranscripts.createdAt));
  }

  async getEventByIdUnscoped(eventId: string): Promise<EventRow[]> {
    return this.db.select().from(events).where(eq(events.id, eventId));
  }

  // ── LiveKit webhook operations ──

  async setRoomStatus(roomName: string, status: string): Promise<void> {
    await this.db.update(events).set({ status }).where(eq(events.id, roomName));
  }

  async getMeetingOwnerWithRecordingStatus(
    roomName: string
  ): Promise<{ userId: string; recordingStatus: boolean }[]> {
    return this.db
      .select({ userId: events.userId, recordingStatus: users.recordingStatus })
      .from(events)
      .innerJoin(users, eq(events.userId, users.userId))
      .where(eq(events.id, roomName));
  }

  async setMeetingStartEpoch(
    roomName: string,
    epochSeconds: number
  ): Promise<void> {
    await this.db
      .update(events)
      .set({ meetingStartTimeEpoch: epochSeconds })
      .where(eq(events.id, roomName));
  }

  async markRoomFinished(
    roomName: string,
    durationMinutes: number
  ): Promise<void> {
    await this.db
      .update(events)
      .set({
        duration: durationMinutes,
        link: "Meeting ended.",
        status: "ended",
      })
      .where(eq(events.id, roomName));
  }

  async getTranscriptChunksFull(
    roomName: string
  ): Promise<TranscriptChunkRow[]> {
    return this.db
      .select()
      .from(meetingTranscripts)
      .where(eq(meetingTranscripts.meetingId, roomName))
      .orderBy(asc(meetingTranscripts.createdAt));
  }

  async getMeetingOwner(roomName: string): Promise<{ userId: string }[]> {
    return this.db
      .select({ userId: events.userId })
      .from(events)
      .where(eq(events.id, roomName));
  }

  async getClientsForUser(
    userId: string
  ): Promise<{ id: number; name: string; email: string | null }[]> {
    return this.db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
      })
      .from(clients)
      .where(eq(clients.userId, userId));
  }

  async updateMeetingAnalysis(
    roomName: string,
    data: MeetingAnalysisData
  ): Promise<void> {
    await this.db.update(events).set(data).where(eq(events.id, roomName));
  }

  async insertDocumentRequestWithItems(
    roomName: string,
    clientId: number | null,
    userId: string,
    items: { name: string; description: string | null }[]
  ): Promise<void> {
    const [req] = await this.db
      .insert(meetingDocumentRequests)
      .values({
        eventId: roomName,
        clientId,
        userId,
        status: "pending_approval",
      })
      .returning({ id: meetingDocumentRequests.id });

    await this.db.insert(documentRequestItems).values(
      items.map((d, i) => ({
        requestId: req.id,
        name: d.name,
        description: d.description,
        sortOrder: i,
      }))
    );
  }

  async incrementAiCredits(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ aiCredits: sql`${users.aiCredits} + 1` })
      .where(eq(users.userId, userId));
  }

  async creditRecordingStorage(
    roomName: string,
    totalSize: number
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const credited = await tx
        .update(events)
        .set({ recordingSize: totalSize })
        .where(and(eq(events.id, roomName), isNull(events.recordingSize)))
        .returning({ userId: events.userId });

      if (credited.length === 0) return;

      await tx
        .update(users)
        .set({ storage: sql`${users.storage} + ${totalSize}` })
        .where(eq(users.userId, credited[0].userId));
    });
  }

  async insertAttendee(meetingId: string, name: string): Promise<void> {
    await this.db
      .insert(meetingAttendees)
      .values({
        meetingId,
        name,
        initials: name[0],
      })
      .onConflictDoNothing({
        target: [meetingAttendees.meetingId, meetingAttendees.name],
      });
  }
}

export const meetingsDrizzle = new MeetingsDrizzle(db);
