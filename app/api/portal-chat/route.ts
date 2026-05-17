import { NextResponse } from "next/server";
import { db } from "@db/db";
import { clientPortalTokens, clients, portalMessages } from "@db/schema";
import { getCurrentUser } from "@/lib/supabase/auth";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Latest message per portal + unread count (client → agency, not yet read by agency)
    const portals = await db
      .select({
        portalId: clientPortalTokens.id,
        clientId: clients.id,
        clientName: clients.name,
        clientEmail: clients.email,
        starred: clientPortalTokens.chatStarred,
        archived: clientPortalTokens.chatArchived,
      })
      .from(clientPortalTokens)
      .innerJoin(clients, eq(clients.id, clientPortalTokens.clientId))
      .where(
        and(
          eq(clientPortalTokens.userId, user.id),
          eq(clientPortalTokens.enabled, true)
        )
      );

    if (portals.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const portalIds = portals.map((p) => p.portalId);

    const lastMessages = await db
      .select({
        portalId: portalMessages.portalId,
        body: portalMessages.body,
        createdAt: portalMessages.createdAt,
      })
      .from(portalMessages)
      .where(
        and(
          eq(portalMessages.userId, user.id),
          inArray(portalMessages.portalId, portalIds)
        )
      )
      .orderBy(desc(portalMessages.createdAt));

    const lastByPortal = new Map<number, { body: string; createdAt: Date }>();
    for (const m of lastMessages) {
      if (!lastByPortal.has(m.portalId)) {
        lastByPortal.set(m.portalId, { body: m.body, createdAt: m.createdAt });
      }
    }

    const unreadRows = await db
      .select({
        portalId: portalMessages.portalId,
        count: sql<number>`count(*)::int`,
      })
      .from(portalMessages)
      .where(
        and(
          eq(portalMessages.userId, user.id),
          eq(portalMessages.senderType, "client"),
          isNull(portalMessages.readAt),
          inArray(portalMessages.portalId, portalIds)
        )
      )
      .groupBy(portalMessages.portalId);

    const unreadByPortal = new Map<number, number>();
    for (const r of unreadRows) {
      unreadByPortal.set(r.portalId, Number(r.count));
    }

    const conversations = portals.map((p) => {
      const last = lastByPortal.get(p.portalId);
      return {
        portalId: p.portalId,
        clientId: p.clientId,
        clientName: p.clientName,
        clientEmail: p.clientEmail,
        lastMessage: last?.body ?? null,
        lastMessageAt: last ? last.createdAt.toISOString() : null,
        unreadCount: unreadByPortal.get(p.portalId) ?? 0,
        starred: p.starred,
        archived: p.archived,
      };
    });

    conversations.sort((a, b) => {
      const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bt - at;
    });

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("[api/portal-chat GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
