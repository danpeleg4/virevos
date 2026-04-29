import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@db/db";
import {
  meetingAttendees,
  meetingTranscripts,
  events,
  users,
  clients,
  meetingDocumentRequests,
  documentRequestItems,
} from "@db/schema";
import { asc, eq, sql } from "drizzle-orm";
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
          await db
            .update(events)
            .set({
              meetingStartTimeEpoch: Math.floor(Date.now() / 1000),
            })
            .where(eq(events.id, roomName));
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

      const [meetingOwner] = await db
        .select({ userId: events.userId })
        .from(events)
        .where(eq(events.id, roomName));
      if (!meetingOwner) return;

      const userClients = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
        })
        .from(clients)
        .where(eq(clients.userId, meetingOwner.userId));

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "user",
            content: `Analyze this meeting transcript and return JSON with fields:
                      summary (2-3 sentences),
                      key_points (string[]),
                      action_items (array of {task, owner, dueDate: YYYY-MM-DD or null, completed: false}),
                      tags (string[]),
                      client_id_guess (integer matching one of the provided client IDs that this meeting is most likely about, or null if uncertain),
                      document_requirements (array of {name, description} listing documents the client needs to provide based on what was discussed, e.g. "Passport", "Form I-94", "OPT EAD card". Empty array if no documents were discussed).

                      Available clients for this user (match by name/email mentioned in transcript): ${JSON.stringify(userClients)}

                      Transcript:
                      ${transcriptText}`,
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
        client_id_guess?: number | null;
        document_requirements?: Array<{
          name: string;
          description?: string | null;
        }>;
      };

      const matchedClientId =
        typeof analysis.client_id_guess === "number" &&
        userClients.some((c) => c.id === analysis.client_id_guess)
          ? analysis.client_id_guess
          : null;

      await db
        .update(events)
        .set({
          ai_summary: analysis.summary,
          key_points: analysis.key_points,
          action_items: analysis.action_items,
          tags: analysis.tags,
          hasTranscript: true,
          hasNotes: true,
          ...(matchedClientId !== null ? { clientId: matchedClientId } : {}),
        })
        .where(eq(events.id, roomName));

      const requirements = (analysis.document_requirements ?? []).filter(
        (d) => d && typeof d.name === "string" && d.name.trim().length > 0
      );

      if (requirements.length > 0) {
        const [req] = await db
          .insert(meetingDocumentRequests)
          .values({
            eventId: roomName,
            clientId: matchedClientId,
            userId: meetingOwner.userId,
            status: "pending_approval",
          })
          .returning({ id: meetingDocumentRequests.id });

        await db.insert(documentRequestItems).values(
          requirements.map((d, i) => ({
            requestId: req.id,
            name: d.name.trim(),
            description: d.description?.trim() || null,
            sortOrder: i,
          }))
        );
      }
    });

    const [eventUser] = await db
      .select({
        userId: events.userId,
      })
      .from(events)
      .where(eq(events.id, roomName));

    await db
      .update(users)
      .set({ ai_credits: sql`${users.ai_credits} + 1` })
      .where(eq(users.user_id, eventUser.userId));
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
