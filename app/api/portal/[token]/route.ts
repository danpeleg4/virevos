import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import {
  clientPortalTokens,
  clients,
  cases,
  caseFiles,
  portalMeetingBookings,
} from "@db/schema";
import { and, eq, gte } from "drizzle-orm";
import { listApprovedRequestsForClient } from "@/lib/document_requests";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

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
}
