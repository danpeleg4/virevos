import { getCurrentUser } from "@/lib/supabase/auth";
import { NextResponse } from "next/server";
import { db } from "@db/db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [recordingStatus] = await db
    .select()
    .from(users)
    .where(eq(users.userId, user.id));
  return NextResponse.json({
    recording_status: recordingStatus.recordingStatus,
  });
}
