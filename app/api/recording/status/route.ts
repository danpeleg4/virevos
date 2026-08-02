import { getCurrentUser } from "@/lib/supabase/auth";
import { NextResponse } from "next/server";
import { userDrizzle } from "@db/classes/user_db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [recordingStatus] = await userDrizzle.getUserRow(user.id);
  return NextResponse.json({
    recording_status: recordingStatus.recordingStatus,
  });
}
