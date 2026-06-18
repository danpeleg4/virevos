"use server";

import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { clientPortalTokens, portalMeetingBookings } from "@db/schema";
import { and, eq } from "drizzle-orm";
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
  input: BookingInput
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

  const tokenRows = await db
    .select()
    .from(clientPortalTokens)
    .where(eq(clientPortalTokens.token, tokenValue))
    .limit(1);

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

  const [booking] = await db
    .insert(portalMeetingBookings)
    .values({
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
    })
    .returning();

  return { success: true, bookingId: booking.id };
}

export async function getPortalBookings(
  userId: string
): Promise<PortalMeetingBooking[]> {
  const user = await getCurrentUser();
  if (!user?.id || user.id !== userId) {
    throw new Error("Unauthorized");
  }

  const rows = await db
    .select()
    .from(portalMeetingBookings)
    .where(eq(portalMeetingBookings.userId, userId));

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
  }));
}

export async function updateBookingStatus(
  bookingId: number,
  status: "confirmed" | "cancelled"
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  await db
    .update(portalMeetingBookings)
    .set({ status })
    .where(
      and(
        eq(portalMeetingBookings.id, bookingId),
        eq(portalMeetingBookings.userId, user.id)
      )
    );
}

export async function acceptBookingWithCalendar(
  bookingId: number
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const rows = await db
    .select()
    .from(portalMeetingBookings)
    .where(
      and(
        eq(portalMeetingBookings.id, bookingId),
        eq(portalMeetingBookings.userId, user.id)
      )
    )
    .limit(1);

  if (!rows.length) throw new Error("Booking not found");
  const booking = rows[0];

  await db
    .update(portalMeetingBookings)
    .set({ status: "confirmed" })
    .where(
      and(
        eq(portalMeetingBookings.id, bookingId),
        eq(portalMeetingBookings.userId, user.id)
      )
    );

  try {
    const calEvent = await addMeetingToCalendar({
      id: "",
      title: `Meeting with ${booking.clientName}`,
      description: booking.notes || `${booking.duration}-minute client meeting`,
      dateTime: booking.dateTime,
      duration: booking.duration,
      isMeeting: true,
    });

    if (calEvent?.id) {
      await db
        .update(portalMeetingBookings)
        .set({ eventId: calEvent.id, meetingLink: calEvent.link ?? null })
        .where(eq(portalMeetingBookings.id, bookingId));
    }
  } catch (err) {
    console.error("[acceptBookingWithCalendar] calendar sync failed:", err);
  }
}
