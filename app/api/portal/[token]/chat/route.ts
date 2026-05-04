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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }
    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Message is too long" },
        { status: 400 }
      );
    }

    const portal = await loadPortal(token);
    if (!portal) {
      return NextResponse.json(
        { error: "Portal not found or disabled" },
        { status: 404 }
      );
    }

    const [inserted] = await db
      .insert(portalMessages)
      .values({
        portalId: portal.id,
        clientId: portal.clientId,
        userId: portal.userId,
        senderType: "client",
        body: message,
      })
      .returning({
        id: portalMessages.id,
        senderType: portalMessages.senderType,
        body: portalMessages.body,
        readAt: portalMessages.readAt,
        createdAt: portalMessages.createdAt,
      });

    return NextResponse.json({
      message: {
        id: inserted.id,
        senderType: inserted.senderType,
        body: inserted.body,
        readAt: inserted.readAt ? inserted.readAt.toISOString() : null,
        createdAt: inserted.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[api/portal/[token]/chat POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
