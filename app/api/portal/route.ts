import { getCurrentUser } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { clientPortalTokens, clients, portalMeetingBookings } from "@db/schema";
import { eq } from "drizzle-orm";

const bookingsType = async (userId: string) => {
  try {
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
      .where(eq(portalMeetingBookings.userId, userId));

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
};

const settingsType = async (userId: string) => {
  try {
    const rows = await db
      .select({
        id: clientPortalTokens.id,
        clientId: clientPortalTokens.clientId,
        token: clientPortalTokens.token,
        enabled: clientPortalTokens.enabled,
        settings: clientPortalTokens.settings,
        lastAccessedAt: clientPortalTokens.lastAccessedAt,
        createdAt: clientPortalTokens.createdAt,
        clientName: clients.name,
        clientEmail: clients.email,
      })
      .from(clientPortalTokens)
      .leftJoin(clients, eq(clientPortalTokens.clientId, clients.id))
      .where(eq(clientPortalTokens.userId, userId));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const portalRecords = rows.map((r) => ({
      ...r,
      portalUrl: `${appUrl}/portal/${r.token}`,
    }));

    return NextResponse.json({ portals: portalRecords });
  } catch (err) {
    console.error("[api/portal/settings GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch portal settings" },
      { status: 500 }
    );
  }
};

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get("type");
  if (type == "bookings") return await bookingsType(user.id);

  return NextResponse.json({ error: "No type found" });
}
