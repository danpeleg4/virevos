import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { googleSyncState } from "@db/schema";
import { eq } from "drizzle-orm";
import { performIncrementalSync } from "@/lib/google_sync";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const channelToken = req.headers.get("X-Goog-Channel-Token"); // set to userId on watch
  const channelId = req.headers.get("X-Goog-Channel-Id");
  const resourceState = req.headers.get("X-Goog-Resource-State");

  // Initial handshake: Google sends this when the watch channel is first registered
  if (resourceState === "sync") {
    return new NextResponse(null, { status: 200 });
  }

  // Only act on "exists" (calendar resource changed)
  if (resourceState !== "exists") {
    return new NextResponse(null, { status: 200 });
  }

  if (!channelToken || !channelId) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Security: verify channelId matches what we stored for this user
  const rows = await db
    .select()
    .from(googleSyncState)
    .where(eq(googleSyncState.userId, channelToken))
    .limit(1);

  if (!rows.length || rows[0].channelId !== channelId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await performIncrementalSync(channelToken);
  } catch (err) {
    console.error("[webhook/google] Incremental sync failed:", err);
    return new NextResponse("Sync error", { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
