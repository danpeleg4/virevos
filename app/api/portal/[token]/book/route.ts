import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { clientPortalTokens, portalMeetingBookings } from "@db/schema";
import { eq } from "drizzle-orm";
import type { BookingInput } from "@/types/portal";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body: BookingInput = await req.json();
    const { clientName, clientEmail, dateTime, duration, notes } = body;

    if (!clientName?.trim() || !clientEmail?.trim() || !dateTime || !duration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(clientEmail)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const parsedDate = new Date(dateTime);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid dateTime" }, { status: 400 });
    }

    const tokenRows = await db
      .select()
      .from(clientPortalTokens)
      .where(eq(clientPortalTokens.token, token))
      .limit(1);

    if (!tokenRows.length || !tokenRows[0].enabled) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    const portalRecord = tokenRows[0];

    if (!portalRecord.settings?.meetingSchedulingEnabled) {
      return NextResponse.json(
        { error: "Scheduling not enabled" },
        { status: 403 }
      );
    }

    const allowedDurations = portalRecord.settings.availability
      ?.meetingDurations ?? [30];
    if (!allowedDurations.includes(duration)) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    const [booking] = await db
      .insert(portalMeetingBookings)
      .values({
        portalId: portalRecord.id,
        clientId: portalRecord.clientId,
        userId: portalRecord.userId,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        dateTime: parsedDate,
        duration,
        status: "pending",
        notes: notes?.trim() || null,
        meetingLink: null,
        eventId: null,
      })
      .returning();

    return NextResponse.json({ success: true, bookingId: booking.id });
  } catch (err) {
    console.error("[api/portal/[token]/book POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
