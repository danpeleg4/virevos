import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getSignedUrl } from "@/lib/storage";
import { RECORDINGS_BUCKET } from "@/lib/supabase/supabase";
import { db } from "@db/db";
import { events } from "@db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Invalid meetingId" }, { status: 400 });
  }

  const [meeting] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, user.id)));

  if (!meeting) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const filePath = `recordings/${user.id}/${id}/composite.mp4`;

  try {
    const url = await getSignedUrl(RECORDINGS_BUCKET, filePath, 3600);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Storage error:", err);
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
}
