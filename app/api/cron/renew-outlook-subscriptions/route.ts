import { NextResponse } from "next/server";
import { db } from "@db/db";
import { outlookSyncState } from "@db/schema";
import { lte } from "drizzle-orm";
import { renewSubscriptions } from "@/lib/outlook/outlook_sync";

export async function GET(req: Request) {
  const authHeader = req.headers
    ? new Headers(req.headers).get("authorization")
    : null;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Renew subscriptions expiring within the next 24 hours
  const threshold = Date.now() + 24 * 60 * 60 * 1000;

  const rows = await db
    .select({ userId: outlookSyncState.userId })
    .from(outlookSyncState)
    .where(lte(outlookSyncState.subscriptionExpiration, threshold));

  await Promise.allSettled(rows.map((r) => renewSubscriptions(r.userId)));

  return NextResponse.json({ renewed: rows.length });
}
