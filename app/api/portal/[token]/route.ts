import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import {
  clientPortalTokens,
  clients,
  cases,
  caseFiles,
  portalMeetingBookings,
} from "@db/schema";
import { and, eq, gte, lt } from "drizzle-orm";
import { listApprovedRequestsForClient } from "@/lib/document_requests";
import type { TimeSlot } from "@/types/portal";

const mainType = async (token: string) => {
  try {
    // Find portal token
    const tokenRows = await db
      .select()
      .from(clientPortalTokens)
      .where(eq(clientPortalTokens.token, token))
      .limit(1);

    if (!tokenRows.length || !tokenRows[0].enabled) {
      return NextResponse.json(
        { error: "Portal not found or disabled" },
        { status: 404 }
      );
    }

    const portalToken = tokenRows[0];

    // Update last accessed
    await db
      .update(clientPortalTokens)
      .set({ lastAccessedAt: new Date() })
      .where(eq(clientPortalTokens.id, portalToken.id));

    // Fetch client info
    const clientRows = await db
      .select()
      .from(clients)
      .where(eq(clients.id, portalToken.clientId))
      .limit(1);

    if (!clientRows.length) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = clientRows[0];

    // Fetch client's cases
    const clientProjects = await db
      .select()
      .from(cases)
      .where(eq(cases.clientId, client.id));

    // Fetch case files for client's cases
    const caseIds = clientProjects.map((p) => p.id);
    const files: Array<typeof caseFiles.$inferSelect> = [];
    if (caseIds.length > 0) {
      // Fetch files for all cases (drizzle doesn't support inArray easily without import, use loop)
      for (const cid of caseIds) {
        const pFiles = await db
          .select()
          .from(caseFiles)
          .where(eq(caseFiles.caseId, cid));
        files.push(...pFiles);
      }
    }

    // Fetch upcoming bookings for this portal
    const upcomingBookings = await db
      .select({
        id: portalMeetingBookings.id,
        dateTime: portalMeetingBookings.dateTime,
        duration: portalMeetingBookings.duration,
        status: portalMeetingBookings.status,
        meetingLink: portalMeetingBookings.meetingLink,
      })
      .from(portalMeetingBookings)
      .where(
        and(
          eq(portalMeetingBookings.portalId, portalToken.id),
          gte(portalMeetingBookings.dateTime, new Date())
        )
      );

    const documentRequests = await listApprovedRequestsForClient(client.id);

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
      },
      settings: portalToken.settings || {},
      cases: clientProjects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        dueDate: p.dueDate,
        priority: p.priority,
        description: p.description,
      })),
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        mimeType: f.mimeType,
        path: f.path,
        createdAt: f.createdAt,
      })),
      bookings: upcomingBookings.map((b) => ({
        id: b.id,
        dateTime: b.dateTime.toISOString(),
        duration: b.duration,
        status: b.status,
        meetingLink: b.meetingLink,
      })),
      documentRequests,
    });
  } catch (err) {
    console.error("[api/portal/[token] GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

const availabilityType = async (
  token: string,
  dateParam: string,
  durationParam: string
) => {
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

  try {
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
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const searchParams = _req.nextUrl.searchParams;
  const type = searchParams.get("type");
  const dateParam = searchParams.get("date"); // "YYYY-MM-DD"
  const durationParam = searchParams.get("duration");

  if (type == "main") return await mainType(token);
  if (type == "availability" && dateParam && durationParam)
    return await availabilityType(token, dateParam, durationParam);

  return NextResponse.json({ error: "No type found" });
}
