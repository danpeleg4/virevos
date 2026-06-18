import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { clientPortalTokens, portalMessages } from "@db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";

async function loadPortal(token: string) {
  const rows = await db
    .select()
    .from(clientPortalTokens)
    .where(eq(clientPortalTokens.token, token))
    .limit(1);
  if (!rows.length || !rows[0].enabled) return null;
  return rows[0];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const portal = await loadPortal(token);
    if (!portal) {
      return NextResponse.json(
        { error: "Portal not found or disabled" },
        { status: 404 }
      );
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

    // Mark agency messages as read by the client
    await db
      .update(portalMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(portalMessages.portalId, portal.id),
          eq(portalMessages.senderType, "agency"),
          isNull(portalMessages.readAt)
        )
      );

    return NextResponse.json({
      messages: rows.map((r) => ({
        id: r.id,
        senderType: r.senderType,
        body: r.body,
        readAt: r.readAt ? r.readAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[api/portal/[token]/chat GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
