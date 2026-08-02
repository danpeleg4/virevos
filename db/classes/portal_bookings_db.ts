import { db, type DrizzleDB } from "../db";
import { clientPortalTokens, clients, portalMeetingBookings } from "../schema";
import { and, eq, gte, lt } from "drizzle-orm";

export type PortalTokenRow = typeof clientPortalTokens.$inferSelect;
export type BookingRow = typeof portalMeetingBookings.$inferSelect;
export type NewBookingRow = typeof portalMeetingBookings.$inferInsert;
export type BookingWithClientRow = BookingRow & {
  clientDisplayName: string | null;
};

export interface PortalBookingsDB {
  getPortalByToken(token: string): Promise<PortalTokenRow[]>;
  insertBooking(values: NewBookingRow): Promise<BookingRow>;
  getBookingsForUser(userId: string): Promise<BookingRow[]>;
  /** Bookings for a user's AppLayout/AI-assistant panel, joined with the
   *  linked client's current display name. */
  getBookingsForUserWithClientName(
    userId: string
  ): Promise<BookingWithClientRow[]>;
  setBookingStatus(
    bookingId: number,
    userId: string,
    status: "confirmed" | "cancelled"
  ): Promise<void>;
  getBookingForUser(bookingId: number, userId: string): Promise<BookingRow[]>;
  setBookingEventInfo(
    bookingId: number,
    eventId: string,
    meetingLink: string | null
  ): Promise<void>;
  /** Upcoming bookings for the portal's main page (client-facing). */
  getUpcomingBookingsForPortal(portalId: number): Promise<BookingRow[]>;
  /** Bookings within a day window, for availability-slot conflict checks. */
  getBookingsInRange(
    portalId: number,
    start: Date,
    end: Date
  ): Promise<Pick<BookingRow, "dateTime" | "duration">[]>;
}

export class PortalBookingsDrizzle implements PortalBookingsDB {
  constructor(private readonly db: DrizzleDB) {}

  async getPortalByToken(token: string): Promise<PortalTokenRow[]> {
    return this.db
      .select()
      .from(clientPortalTokens)
      .where(eq(clientPortalTokens.token, token))
      .limit(1);
  }

  async insertBooking(values: NewBookingRow): Promise<BookingRow> {
    const [booking] = await this.db
      .insert(portalMeetingBookings)
      .values(values)
      .returning();
    return booking;
  }

  async getBookingsForUser(userId: string): Promise<BookingRow[]> {
    return this.db
      .select()
      .from(portalMeetingBookings)
      .where(eq(portalMeetingBookings.userId, userId));
  }

  async getBookingsForUserWithClientName(
    userId: string
  ): Promise<BookingWithClientRow[]> {
    return this.db
      .select({
        id: portalMeetingBookings.id,
        portalId: portalMeetingBookings.portalId,
        clientId: portalMeetingBookings.clientId,
        userId: portalMeetingBookings.userId,
        clientName: portalMeetingBookings.clientName,
        clientEmail: portalMeetingBookings.clientEmail,
        dateTime: portalMeetingBookings.dateTime,
        duration: portalMeetingBookings.duration,
        status: portalMeetingBookings.status,
        notes: portalMeetingBookings.notes,
        meetingLink: portalMeetingBookings.meetingLink,
        eventId: portalMeetingBookings.eventId,
        createdAt: portalMeetingBookings.createdAt,
        clientDisplayName: clients.name,
      })
      .from(portalMeetingBookings)
      .leftJoin(clients, eq(portalMeetingBookings.clientId, clients.id))
      .where(eq(portalMeetingBookings.userId, userId));
  }

  async setBookingStatus(
    bookingId: number,
    userId: string,
    status: "confirmed" | "cancelled"
  ): Promise<void> {
    await this.db
      .update(portalMeetingBookings)
      .set({ status })
      .where(
        and(
          eq(portalMeetingBookings.id, bookingId),
          eq(portalMeetingBookings.userId, userId)
        )
      );
  }

  async getBookingForUser(
    bookingId: number,
    userId: string
  ): Promise<BookingRow[]> {
    return this.db
      .select()
      .from(portalMeetingBookings)
      .where(
        and(
          eq(portalMeetingBookings.id, bookingId),
          eq(portalMeetingBookings.userId, userId)
        )
      )
      .limit(1);
  }

  async setBookingEventInfo(
    bookingId: number,
    eventId: string,
    meetingLink: string | null
  ): Promise<void> {
    await this.db
      .update(portalMeetingBookings)
      .set({ eventId, meetingLink })
      .where(eq(portalMeetingBookings.id, bookingId));
  }

  async getUpcomingBookingsForPortal(portalId: number): Promise<BookingRow[]> {
    return this.db
      .select()
      .from(portalMeetingBookings)
      .where(
        and(
          eq(portalMeetingBookings.portalId, portalId),
          gte(portalMeetingBookings.dateTime, new Date())
        )
      );
  }

  async getBookingsInRange(
    portalId: number,
    start: Date,
    end: Date
  ): Promise<Pick<BookingRow, "dateTime" | "duration">[]> {
    return this.db
      .select({
        dateTime: portalMeetingBookings.dateTime,
        duration: portalMeetingBookings.duration,
      })
      .from(portalMeetingBookings)
      .where(
        and(
          eq(portalMeetingBookings.portalId, portalId),
          gte(portalMeetingBookings.dateTime, start),
          lt(portalMeetingBookings.dateTime, end)
        )
      );
  }
}

export const portalBookingsDrizzle = new PortalBookingsDrizzle(db);
