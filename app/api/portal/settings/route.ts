import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { clientPortalTokens, clients } from "@db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getCurrentUser();
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
    return NextResponse.json(
      { error: "Failed to fetch portal settings" },
      { status: 500 }
    );
  }
}
