import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/supabase/auth";
import type { PortalBookingsDB } from "@db/portal_bookings_db";
import type { CalendarDB } from "@db/calendar_db";
import type { GraphCalendarServiceInterface } from "@/api_client/ms_graph/graph_calendar_service";
import type { OutlookDB } from "@db/outlook_db";
import type { GraphAuthServiceInterface } from "@/api_client/ms_graph/graph_auth_service";
import type { BookingInput, PortalMeetingBooking } from "@/types/portal";
import { addMeetingToCalendar } from "@/lib/workspace/calendar";
import {
  MAX_NAME,
  MAX_NOTES,
  ValidationError,
  optionalString,
  requireDateString,
  requireEmail,
  requireInt,
  requireString,
} from "@/lib/util/validation";
import { rateLimitHeaders } from "@/lib/util/rate_limit";

/**
 * Public, token-authenticated booking action invoked from the client portal.
 * Validates the booking input, enforces a per-IP rate limit, and inserts a
 * pending meeting booking for the portal identified by `token`.
 */
export async function createPortalBooking(
  token: string,
  input: BookingInput,
  portalBookingsDb: PortalBookingsDB
): Promise<{ success: true; bookingId: number }> {
  const limited = rateLimitHeaders(await headers(), {
    keyPrefix: "portal-book",
    windowMs: 60_000,
    max: 5,
  });
  if (limited) throw new ValidationError("Too many requests", 429);

  const tokenValue = requireString(token, "token", MAX_NAME);
  const clientName = requireString(input.clientName, "clientName", MAX_NAME);
  const clientEmail = requireEmail(input.clientEmail, "clientEmail");
  const parsedDate = requireDateString(input.dateTime, "dateTime");
  const duration = requireInt(input.duration, "duration");
  const notes = optionalString(input.notes, "notes", MAX_NOTES);

  const tokenRows = await portalBookingsDb.getPortalByToken(tokenValue);

  if (!tokenRows.length || !tokenRows[0].enabled) {
    throw new ValidationError("Portal not found", 404);
  }

  const portalRecord = tokenRows[0];

  if (!portalRecord.settings?.meetingSchedulingEnabled) {
    throw new ValidationError("Scheduling not enabled", 403);
  }

  const allowedDurations = portalRecord.settings.availability
    ?.meetingDurations ?? [30];
  if (!allowedDurations.includes(duration)) {
    throw new ValidationError("Invalid duration", 400);
  }

  const booking = await portalBookingsDb.insertBooking({
    portalId: portalRecord.id,
    clientId: portalRecord.clientId,
    userId: portalRecord.userId,
    clientName,
    clientEmail,
    dateTime: parsedDate,
    duration,
    status: "pending",
    notes: notes ?? null,
    meetingLink: null,
    eventId: null,
  });

  return { success: true, bookingId: booking.id };
}

export type PortalMeetingBookingWithClient = PortalMeetingBooking & {
  clientDisplayName: string | null;
};

export async function getPortalBookings(
  userId: string,
  portalBookingsDb: PortalBookingsDB
): Promise<PortalMeetingBookingWithClient[]> {
  const user = await getCurrentUser();
  if (!user?.id || user.id !== userId) {
    throw new Error("Unauthorized");
  }

  const rows = await portalBookingsDb.getBookingsForUserWithClientName(userId);

  return rows.map((r) => ({
    id: r.id,
    portalId: r.portalId,
    clientId: r.clientId,
    userId: r.userId,
    clientName: r.clientName,
    clientEmail: r.clientEmail,
    dateTime: r.dateTime.toISOString(),
    duration: r.duration,
    status: r.status as "pending" | "confirmed" | "cancelled",
    notes: r.notes,
    meetingLink: r.meetingLink,
    eventId: r.eventId,
    createdAt: r.createdAt?.toISOString() ?? null,
    clientDisplayName: r.clientDisplayName,
  }));
}

export async function updateBookingStatus(
  bookingId: number,
  status: "confirmed" | "cancelled",
  portalBookingsDb: PortalBookingsDB
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  await portalBookingsDb.setBookingStatus(bookingId, user.id, status);
}

export async function acceptBookingWithCalendar(
  bookingId: number,
  portalBookingsDb: PortalBookingsDB,
  calendarDb: CalendarDB,
  graphCalendar: GraphCalendarServiceInterface,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const rows = await portalBookingsDb.getBookingForUser(bookingId, user.id);

  if (!rows.length) throw new Error("Booking not found");
  const booking = rows[0];

  await portalBookingsDb.setBookingStatus(bookingId, user.id, "confirmed");

  try {
    const calEvent = await addMeetingToCalendar(
      {
        id: "",
        title: `Meeting with ${booking.clientName}`,
        description:
          booking.notes || `${booking.duration}-minute client meeting`,
        dateTime: booking.dateTime,
        duration: booking.duration,
        isMeeting: true,
      },
      calendarDb,
      graphCalendar,
      outlookDb,
      graphAuthService
    );

    if (calEvent?.id) {
      await portalBookingsDb.setBookingEventInfo(
        bookingId,
        calEvent.id,
        calEvent.link ?? null
      );
    }
  } catch (err) {
    console.error("[acceptBookingWithCalendar] calendar sync failed:", err);
  }
}
