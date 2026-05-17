import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { cases, clients, clientPortalTokens } from "@db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/supabase/auth";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const clientId = Number(id);
    if (Number.isNaN(clientId)) {
      return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        status: clients.status,
        notes: clients.notes,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        totalCases: sql<number>`COUNT(${cases.id})::int`,
        completedCases: sql<number>`COUNT(CASE WHEN ${cases.status} = 'completed' THEN 1 END)::int`,
        activeCases: sql<number>`COUNT(CASE WHEN ${cases.status} = 'active' THEN 1 END)::int`,
      })
      .from(clients)
      .leftJoin(cases, eq(cases.clientId, clients.id))
      .where(and(eq(clients.id, clientId), eq(clients.userId, user.id)))
      .groupBy(clients.id)
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const portalRows = await db
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
    const portal = portalRows[0]
      ? {
          ...portalRows[0],
          portalUrl: `${appUrl}/portal/${portalRows[0].token}`,
        }
      : null;

    return NextResponse.json({ client: rows[0], portal });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
