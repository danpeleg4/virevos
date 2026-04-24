import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { events, meetingTranscripts } from "@db/schema";
import { and, asc, eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Invalid meetingId" }, { status: 400 });
  }

  const [meeting] = await db
    .select({
      id: events.id,
      meetingStartTimeEpoch: events.meetingStartTimeEpoch,
    })
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, user.id)));

  if (!meeting || !meeting.meetingStartTimeEpoch) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const chunks = await db
    .select({
      speaker: meetingTranscripts.speakerIdentity,
      text: meetingTranscripts.text,
      createdAt: meetingTranscripts.createdAt,
    })
    .from(meetingTranscripts)
    .where(eq(meetingTranscripts.meetingId, id))
    .orderBy(asc(meetingTranscripts.createdAt));

  if (chunks.length === 0) {
    return NextResponse.json({ error: "No transcript found" }, { status: 404 });
  }

  const meetingStartTimeEpoch = meeting.meetingStartTimeEpoch;

  return NextResponse.json({
    chunks: chunks,
    meetingStartTimeEpoch: meetingStartTimeEpoch,
  });
}
