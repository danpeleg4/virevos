import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { meetingAttendees, events } from "@db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  // Parse JSON body
  const event = await req.json();
  console.log("Received event:", event);

  const roomName = event?.room?.name ?? event?.room?.sid;
  if (!roomName) {
    return NextResponse.json({ status: "missing room" }, { status: 400 });
  }

  if (event.event === "room_started") {
    await db
      .update(events)
      .set({ status: "active" })
      .where(eq(events.id, roomName));
  }

  if (event.event === "room_finished") {
    const res = await db.select().from(events).where(eq(events.id, roomName));

    if (res.length > 0) {
      const finishedAt = Number(event.createdAt);
      const createdAt = Number(event.room.creationTimeMs);
      const durationInMinutes =
        Number.isFinite(finishedAt) && Number.isFinite(createdAt)
          ? Math.max(1, Math.round((finishedAt - createdAt) / 60000))
          : res[0].duration;
      await db
        .update(events)
        .set({
          duration: durationInMinutes,
          link: "Meeting ended.",
          status: "ended",
        })
        .where(eq(events.id, res[0].id));
    }
  }
  if (event.event === "participant_joined") {
    if (event.participant.kind === "EGRESS") {
      return NextResponse.json({ status: "EGRESS OUT" });
    }
    const identity = event.participant?.identity;
    if (identity) {
      await db.insert(meetingAttendees).values({
        meetingId: roomName,
        name: identity,
        initials: identity[0],
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}
