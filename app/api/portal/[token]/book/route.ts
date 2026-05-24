import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { clientPortalTokens, portalMeetingBookings } from "@db/schema";
import { eq } from "drizzle-orm";
import type { BookingInput } from "@/types/portal";
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
import { rateLimit } from "@/lib/util/rate_limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = rateLimit(req, {
    keyPrefix: "portal-book",
    windowMs: 60_000,
    max: 5,
  });
  if (limited) return limited;

  try {
    const { token } = await params;
    const body: BookingInput = await req.json();

    const clientName = requireString(body.clientName, "clientName", MAX_NAME);
    const clientEmail = requireEmail(body.clientEmail, "clientEmail");
    const parsedDate = requireDateString(body.dateTime, "dateTime");
    const duration = requireInt(body.duration, "duration");
    const notes = optionalString(body.notes, "notes", MAX_NOTES);

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

    return NextResponse.json({ success: true, bookingId: booking.id });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/portal/[token]/book POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
