"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { portalMeetingBookings } from "@db/schema";
import { and, eq } from "drizzle-orm";
import type { PortalMeetingBooking } from "@/types/portal";
import { addMeetingToCalendar } from "@/lib/calendar";

export async function getPortalBookings(
  userId: string
): Promise<PortalMeetingBooking[]> {
  const user = await currentUser();
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
  const user = await currentUser();
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
  const user = await currentUser();
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
      description:
        booking.notes || `${booking.duration}-minute client meeting`,
      dateTime: booking.dateTime,
      duration: booking.duration,
      isMeeting: true,
    });

    if (calEvent?.id) {
      await db
        .update(portalMeetingBookings)
        .set({ eventId: calEvent.id })
        .where(eq(portalMeetingBookings.id, bookingId));
    }
  } catch (err) {
    console.error("[acceptBookingWithCalendar] calendar sync failed:", err);
  }
}
