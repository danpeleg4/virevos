import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { clientPortalTokens, portalMeetingBookings } from "@db/schema";
import { and, eq, gte, lt } from "drizzle-orm";
import type { TimeSlot } from "@/types/portal";

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const VALID_DURATIONS = [15, 30, 45, 60];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // "YYYY-MM-DD"
    const durationParam = searchParams.get("duration");

    if (!dateParam || !durationParam) {
      return NextResponse.json(
        { error: "Missing date or duration" },
        { status: 400 }
      );
    }

    const duration = parseInt(durationParam, 10);
    if (isNaN(duration) || !VALID_DURATIONS.includes(duration)) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
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
    const availability = portalRecord.settings?.availability;

    if (!portalRecord.settings?.meetingSchedulingEnabled || !availability) {
      return NextResponse.json({ slots: [] });
    }

    const requestedDate = new Date(`${dateParam}T00:00:00`);
    if (isNaN(requestedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const dayName = DAYS[requestedDate.getDay()];
    const dayConfig = availability.weeklySchedule[dayName];

    if (!dayConfig?.enabled) {
      return NextResponse.json({ slots: [] });
    }

    const [startH, startM] = dayConfig.startTime.split(":").map(Number);
    const [endH, endM] = dayConfig.endTime.split(":").map(Number);

    const dayStart = new Date(requestedDate);
    dayStart.setHours(startH, startM, 0, 0);
    const dayEnd = new Date(requestedDate);
    dayEnd.setHours(endH, endM, 0, 0);

    const nextDay = new Date(requestedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingBookings = await db
      .select({
        dateTime: portalMeetingBookings.dateTime,
        duration: portalMeetingBookings.duration,
      })
      .from(portalMeetingBookings)
      .where(
        and(
          eq(portalMeetingBookings.portalId, portalRecord.id),
          gte(portalMeetingBookings.dateTime, dayStart),
          lt(portalMeetingBookings.dateTime, nextDay)
        )
      );

    const buffer = availability.bufferMinutes;
    const slots: TimeSlot[] = [];
    let current = new Date(dayStart);

    while (current.getTime() + duration * 60000 <= dayEnd.getTime()) {
      const slotEnd = new Date(current.getTime() + duration * 60000);

      const hasConflict = existingBookings.some((b) => {
        const bStart = b.dateTime.getTime() - buffer * 60000;
        const bEnd = b.dateTime.getTime() + b.duration * 60000 + buffer * 60000;
        return current.getTime() < bEnd && slotEnd.getTime() > bStart;
      });

      const isPast = current.getTime() < Date.now();

      slots.push({
        startTime: current.toISOString(),
        available: !hasConflict && !isPast,
      });

      current = new Date(current.getTime() + duration * 60000);
    }

    return NextResponse.json({ slots });
  } catch (err) {
    console.error("[api/portal/[token]/availability GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
