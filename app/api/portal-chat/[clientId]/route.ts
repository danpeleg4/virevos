import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { clientPortalTokens, portalMessages } from "@db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

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
    const user = await currentUser();
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

    // Mark client messages as read by the agency
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

const VALID_ACTIONS = new Set([
  "star",
  "unstar",
  "archive",
  "unarchive",
  "markUnread",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { clientId: clientIdStr } = await params;
    const clientId = Number(clientIdStr);
    if (!Number.isFinite(clientId)) {
      return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
    }

    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "";
    if (!VALID_ACTIONS.has(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const portal = await loadPortalForUser(clientId, user.id);
    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    if (action === "star" || action === "unstar") {
      await db
        .update(clientPortalTokens)
        .set({ chatStarred: action === "star" })
        .where(eq(clientPortalTokens.id, portal.id));
    } else if (action === "archive" || action === "unarchive") {
      await db
        .update(clientPortalTokens)
        .set({ chatArchived: action === "archive" })
        .where(eq(clientPortalTokens.id, portal.id));
    } else if (action === "markUnread") {
      // Reset read state on the most recent client message so the
      // conversation re-surfaces in the unread list.
      const latestClientMsg = await db
        .select({ id: portalMessages.id })
        .from(portalMessages)
        .where(
          and(
            eq(portalMessages.portalId, portal.id),
            eq(portalMessages.senderType, "client")
          )
        )
        .orderBy(desc(portalMessages.createdAt))
        .limit(1);

      if (latestClientMsg.length > 0) {
        await db
          .update(portalMessages)
          .set({ readAt: null })
          .where(eq(portalMessages.id, latestClientMsg[0].id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/portal-chat/[clientId] PATCH]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await currentUser();
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

    await db
      .delete(portalMessages)
      .where(eq(portalMessages.portalId, portal.id));

    // Reset conversation flags so the deleted thread doesn't linger.
    await db
      .update(clientPortalTokens)
      .set({ chatStarred: false, chatArchived: false })
      .where(eq(clientPortalTokens.id, portal.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/portal-chat/[clientId] DELETE]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { clientId: clientIdStr } = await params;
    const clientId = Number(clientIdStr);
    if (!Number.isFinite(clientId)) {
      return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
    }

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

    const portal = await loadPortalForUser(clientId, user.id);
    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    const [inserted] = await db
      .insert(portalMessages)
      .values({
        portalId: portal.id,
        clientId: portal.clientId,
        userId: portal.userId,
        senderType: "agency",
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
    console.error("[api/portal-chat/[clientId] POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
