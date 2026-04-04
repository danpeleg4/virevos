import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { meetingAttendees, events, users } from "@db/schema";
import { eq } from "drizzle-orm";
import {
  EgressClient,
  EncodedFileOutput,
  EncodedOutputs,
  WebhookEvent,
  WebhookReceiver,
} from "livekit-server-sdk";
import { ParticipantInfo_Kind } from "@livekit/protocol";

const webhookReceiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

/*
LiveKit webhook
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const authHeader = req.headers.get("Authorization");

  let event: WebhookEvent;
  try {
    event = await webhookReceiver.receive(body, authHeader ?? undefined);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
      const createdAt = Number(event?.room?.creationTimeMs);
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
    if (event.participant?.kind === ParticipantInfo_Kind.EGRESS) {
      return NextResponse.json({ status: "EGRESS OUT" });
    }
    const identity = event.participant?.identity;
    if (identity) {
      await db
        .insert(meetingAttendees)
        .values({
          meetingId: roomName,
          name: identity,
          initials: identity[0],
        })
        .onConflictDoNothing({
          target: [meetingAttendees.meetingId, meetingAttendees.name],
        });

      const [dbEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, roomName));

      const [userStatus] = await db
        .select({ recordingStatus: users.recordingStatus })
        .from(users)
        .where(eq(users.user_id, dbEvent.userId));

      if (userStatus.recordingStatus) {
        const egressClient = new EgressClient(process.env.LIVEKIT_HOST!);
        const outputs: EncodedOutputs = {
          file: new EncodedFileOutput({
            filepath: `recordings/${dbEvent.userId}/${dbEvent.id}/${identity}/${crypto.randomUUID().slice(0, 5)}.mp4`,
            output: {
              case: "s3",
              value: {
                accessKey: process.env.SUPABASE_S3_ACCESS_KEY_ID,
                secret: process.env.SUPABASE_S3_SECRET_ACCESS_KEY,
                endpoint: `${process.env.SUPABASE_URL}/storage/v1/s3`,
                bucket: "recording",
                region: "auto",
                forcePathStyle: true,
              },
            },
          }),
        };
        await egressClient.startParticipantEgress(roomName, identity, outputs);
      }
    }
  }
  return NextResponse.json({ status: "ok" });
}
