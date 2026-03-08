import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { clientPortalTokens, clients } from "@db/schema";
import { and, eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      .where(eq(clientPortalTokens.userId, user.id));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const portalRecords = rows.map((r) => ({
      ...r,
      portalUrl: `${appUrl}/portal/${r.token}`,
    }));

    return NextResponse.json({ portals: portalRecords });
  } catch (err) {
    console.error("[api/portal/settings GET]", err);
    return NextResponse.json({ error: "Failed to fetch portal settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, settings, enabled } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    // Verify client belongs to user
    const clientRows = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, user.id)))
      .limit(1);

    if (!clientRows.length) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Check if token exists for this client
    const existing = await db
      .select()
      .from(clientPortalTokens)
      .where(
        and(
          eq(clientPortalTokens.clientId, clientId),
          eq(clientPortalTokens.userId, user.id)
        )
      )
      .limit(1);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    let record;
    if (existing.length > 0) {
      const updateData: any = {};
      if (settings !== undefined) updateData.settings = settings;
      if (enabled !== undefined) updateData.enabled = enabled;

      const [updated] = await db
        .update(clientPortalTokens)
        .set(updateData)
        .where(eq(clientPortalTokens.id, existing[0].id))
        .returning();
      record = updated;
    } else {
      const token = crypto.randomUUID();
      const [inserted] = await db
        .insert(clientPortalTokens)
        .values({
          clientId,
          token,
          enabled: enabled ?? true,
          settings: settings || {},
          userId: user.id,
        })
        .returning();
      record = inserted;
    }

    return NextResponse.json({
      ...record,
      portalUrl: `${appUrl}/portal/${record.token}`,
      clientName: clientRows[0].name,
    });
  } catch (err) {
    console.error("[api/portal/settings POST]", err);
    return NextResponse.json({ error: "Failed to save portal settings" }, { status: 500 });
  }
}
