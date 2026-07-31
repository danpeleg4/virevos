import { db, type DrizzleDB } from "./db";
import { events, meetingAttendees } from "./schema";
import { and, eq, ilike } from "drizzle-orm";

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type AttendeeRow = typeof meetingAttendees.$inferSelect;

export type EventWithAttendeesRow = EventRow & { attendees: AttendeeRow[] };

export type EventUpdateData = Partial<
  Pick<
    NewEventRow,
    "title" | "description" | "dateTime" | "duration" | "status"
  >
>;

export interface CalendarDB {
  getEventsWithAttendees(userId: string): Promise<EventWithAttendeesRow[]>;
  /** No user scoping — meet pages resolve host status from the row itself. */
  getEventByIdUnscoped(eventId: string): Promise<EventRow[]>;
  getEventById(eventId: string, userId: string): Promise<EventRow[]>;
  getEventByTitle(userId: string, title: string): Promise<EventRow[]>;
  insertEvent(values: NewEventRow): Promise<EventRow>;
  updateEvent(
    eventId: string,
    userId: string,
    data: EventUpdateData
  ): Promise<void>;
  deleteEvent(eventId: string, userId: string): Promise<void>;
  /** Bulk, unjoined — used by the Outlook calendar sync reconciliation pass. */
  getEventsForUser(userId: string): Promise<EventRow[]>;
  insertEvents(values: NewEventRow[]): Promise<void>;
  deleteEventByOutlookEventId(
    outlookEventId: string,
    userId: string
  ): Promise<void>;
}

export class CalendarDrizzle implements CalendarDB {
  constructor(private readonly db: DrizzleDB) {}

  async getEventsWithAttendees(
    userId: string
  ): Promise<EventWithAttendeesRow[]> {
    return this.db.query.events.findMany({
      where: eq(events.userId, userId),
      with: {
        attendees: true,
      },
    });
  }

  async getEventByIdUnscoped(eventId: string): Promise<EventRow[]> {
    return this.db.select().from(events).where(eq(events.id, eventId));
  }

  async getEventById(eventId: string, userId: string): Promise<EventRow[]> {
    return this.db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.userId, userId)))
      .limit(1);
  }

  async getEventByTitle(userId: string, title: string): Promise<EventRow[]> {
    return this.db
      .select()
      .from(events)
      .where(and(eq(events.userId, userId), ilike(events.title, title)))
      .orderBy(events.id)
      .limit(1);
  }

  async insertEvent(values: NewEventRow): Promise<EventRow> {
    const [inserted] = await this.db.insert(events).values(values).returning();
    return inserted;
  }

  async updateEvent(
    eventId: string,
    userId: string,
    data: EventUpdateData
  ): Promise<void> {
    await this.db
      .update(events)
      .set(data)
      .where(and(eq(events.id, eventId), eq(events.userId, userId)));
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    await this.db
      .delete(events)
      .where(and(eq(events.id, eventId), eq(events.userId, userId)));
  }

  async getEventsForUser(userId: string): Promise<EventRow[]> {
    return this.db.select().from(events).where(eq(events.userId, userId));
  }

  async insertEvents(values: NewEventRow[]): Promise<void> {
    if (values.length === 0) return;
    await this.db.insert(events).values(values);
  }

  async deleteEventByOutlookEventId(
    outlookEventId: string,
    userId: string
  ): Promise<void> {
    await this.db
      .delete(events)
      .where(
        and(
          eq(events.outlookEventId, outlookEventId),
          eq(events.userId, userId)
        )
      );
  }
}

export const calendarDrizzle = new CalendarDrizzle(db);
