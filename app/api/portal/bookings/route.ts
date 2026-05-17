import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { portalMeetingBookings, clients } from "@db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select({
        id: portalMeetingBookings.id,
        portalId: portalMeetingBookings.portalId,
        clientId: portalMeetingBookings.clientId,
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
      .where(eq(portalMeetingBookings.userId, user.id));

    return NextResponse.json({
      bookings: rows.map((r) => ({
        ...r,
        dateTime: r.dateTime.toISOString(),
        createdAt: r.createdAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    console.error("[api/portal/bookings GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
