import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { clientPortalTokens, clients } from "@db/schema";
import { and, eq } from "drizzle-orm";
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
      .where(
        and(
          eq(clientPortalTokens.clientId, clientId),
          eq(clientPortalTokens.userId, user.id)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ portal: null });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const portal = {
      ...rows[0],
      portalUrl: `${appUrl}/portal/${rows[0].token}`,
    };

    return NextResponse.json({ portal });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
