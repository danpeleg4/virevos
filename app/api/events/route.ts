import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { events } from "@db/schema";
import { eq } from "drizzle-orm";
import { deriveMeetingStatus } from "@/lib/meeting_status";

export async function GET() {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Return DB meetings
  const rows = await db.query.events.findMany({
    where: eq(events.userId, user.id),
    with: {
      attendees: true,
    },
  });

  const now = new Date();
  return NextResponse.json(rows.map((row) => deriveMeetingStatus(row, now)));
}
