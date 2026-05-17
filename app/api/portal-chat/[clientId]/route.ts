import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { clientPortalTokens, portalMessages } from "@db/schema";
import { getCurrentUser } from "@/lib/supabase/auth";
import { and, asc, eq, isNull } from "drizzle-orm";

async function loadPortalForUser(clientId: number, userId: string) {
  const rows = await db
    .select()
    .from(clientPortalTokens)
    .where(
      and(
        eq(clientPortalTokens.clientId, clientId),
        eq(clientPortalTokens.userId, userId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { clientId: clientIdStr } = await params;
    const clientId = Number(clientIdStr);
    if (!Number.isFinite(clientId)) {
      return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
    }

    const portal = await loadPortalForUser(clientId, user.id);
    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    const rows = await db
      .select({
        id: portalMessages.id,
        senderType: portalMessages.senderType,
        body: portalMessages.body,
        readAt: portalMessages.readAt,
        createdAt: portalMessages.createdAt,
      })
      .from(portalMessages)
      .where(eq(portalMessages.portalId, portal.id))
      .orderBy(asc(portalMessages.createdAt));

    await db
      .update(portalMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(portalMessages.portalId, portal.id),
          eq(portalMessages.senderType, "client"),
          isNull(portalMessages.readAt)
        )
      );

    return NextResponse.json({
      portalId: portal.id,
      messages: rows.map((r) => ({
        id: r.id,
        senderType: r.senderType,
        body: r.body,
        readAt: r.readAt ? r.readAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[api/portal-chat/[clientId] GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
