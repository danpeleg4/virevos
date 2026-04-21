import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@db/db";
import { meetingAttendees, meetingTranscripts, events, users } from "@db/schema";
import { asc, eq } from "drizzle-orm";
import {
  EgressClient,
  EncodedFileOutput,
  EncodedOutputs,
  WebhookEvent,
  WebhookReceiver,
} from "livekit-server-sdk";
import { ParticipantInfo_Kind } from "@livekit/protocol";
import OpenAI from "openai";

export const maxDuration = 60;

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

    const [meeting] = await db
      .select({ userId: events.userId, recordingStatus: users.recordingStatus })
      .from(events)
      .innerJoin(users, eq(events.userId, users.user_id))
      .where(eq(events.id, roomName));

    if (meeting?.recordingStatus) {
      try {
        const egressClient = new EgressClient(process.env.LIVEKIT_HOST!);

        // Check if egress is already running for this room to avoid duplicates
        const existingEgresses = await egressClient.listEgress({ roomName });
        const alreadyRunning = existingEgresses.some(
          (e) => e.status === 0 || e.status === 1 // STARTING or ACTIVE
        );

        if (alreadyRunning) {
          console.log(`Egress already running for room ${roomName}, skipping`);
        } else {
          const outputs: EncodedOutputs = {
            file: new EncodedFileOutput({
              filepath: `recordings/${meeting.userId}/${roomName}/composite.mp4`,
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
          await egressClient.startRoomCompositeEgress(roomName, outputs);
        }
      } catch (err) {
        console.error("Failed to start composite egress:", err);
      }
    }
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

    after(async () => {
      const chunks = await db
        .select()
        .from(meetingTranscripts)
        .where(eq(meetingTranscripts.meetingId, roomName))
        .orderBy(asc(meetingTranscripts.createdAt));

      if (chunks.length === 0) return;

      const transcriptText = chunks
        .map((c) => `${c.speakerIdentity}: ${c.text}`)
        .join("\n");

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `Analyze this meeting transcript and return JSON with fields: summary (2-3 sentences), key_points (string[]), action_items (array of {task, owner, dueDate: YYYY-MM-DD or null, completed: false}), tags (string[]).\n\n${transcriptText}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const analysis = JSON.parse(
        response.choices[0].message.content ?? "{}"
      ) as {
        summary?: string;
        key_points?: string[];
        action_items?: Array<{
          task: string;
          owner: string;
          dueDate: string | null;
          completed: boolean;
        }>;
        tags?: string[];
      };

      await db
        .update(events)
        .set({
          ai_summary: analysis.summary,
          key_points: analysis.key_points,
          action_items: analysis.action_items,
          tags: analysis.tags,
          hasTranscript: true,
          hasNotes: true,
        })
        .where(eq(events.id, roomName));
    });
  }

  if (event.event === "participant_joined") {
    if (
      event.participant?.kind === ParticipantInfo_Kind.EGRESS ||
      event.participant?.kind === ParticipantInfo_Kind.AGENT
    ) {
      return NextResponse.json({ status: "ok" });
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
    }
  }

  return NextResponse.json({ status: "ok" });
}
