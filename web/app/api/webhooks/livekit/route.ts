import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { meetingAttendees, events } from "@db/schema";
import { eq } from "drizzle-orm";
import {EgressClient, EncodedFileOutput, EncodedOutputs} from "livekit-server-sdk";

/*
LiveKit webhook
 */
export async function POST(req: NextRequest) {
  const event = await req.json();
  const egressClient = new EgressClient(process.env.LIVEKIT_HOST!);
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

      const [event] = await db.select().from(events).where(eq(events.id, roomName));

      //TODO ADD UNIQUENESS TO FILE NAME IF THERE ARE TWO PEOPLE WITH SAME NAME NEED TO HAVE SOME UUID
      const outputs: EncodedOutputs = {
        file: new EncodedFileOutput({
          filepath: `recordings/${event.userId}/${event.id}/${identity}/${crypto.randomUUID().slice(0,5)}.mp4`,
          output: {
            case: "s3",
            value: {
              accessKey: process.env.AWS_S3_ACCESS_KEY,
              secret: process.env.AWS_S3_SECRET_KEY,
              bucket: process.env.AWS_BUCKET_NAME,
              region: process.env.AWS_REGION,
              forcePathStyle: true,
            },
          },
        }),
      }
      await egressClient.startParticipantEgress(roomName, identity, outputs)
    }
  }
  return NextResponse.json({ status: "ok" });
}
