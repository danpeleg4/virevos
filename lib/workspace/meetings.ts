import { getCurrentUser } from "@/lib/supabase/auth";
import type { ActionItem, MeetingsDB } from "@db/meetings_db";
import type { OpenAIClientInterface } from "@/api_client/openai_client";
import type { LiveKitClientInterface } from "@/api_client/livekit_client";
import type { StorageClientInterface } from "@/api_client/supabase_storage_client";
import type { BillingDB } from "@db/billing_db";
import type { PlanLimitsDB } from "@db/plan_limits_db";
import {
  MAX_MESSAGE,
  MAX_SHORT,
  MAX_TITLE,
  ValidationError,
  requireInt,
  requireString,
} from "../util/validation";
import { TRANSCRIPT_BUCKET, TRANSCRIPT_INDEX } from "../embeddings";
import { RECORDINGS_BUCKET } from "@/lib/supabase/supabase";
import { assertCanUseAI } from "../plan_limits";

export async function startMeeting(meetingId: string, meetingsDb: MeetingsDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  const id = requireString(meetingId, "meetingId", MAX_SHORT);
  await meetingsDb.setEventStatus(id, user.id, "active");
}

export async function createInstantMeeting(
  title: string,
  meetingsDb: MeetingsDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  const validTitle = requireString(title, "title", MAX_TITLE);

  const now = new Date();
  const meetingId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  await meetingsDb.insertEvent({
    id: meetingId,
    title: validTitle,
    link: `https://virevos.com/meet/${meetingId}`,
    dateTime: now,
    origin: "app",
    duration: 60,
    isMeeting: true,
    status: "active",
    userId: user.id,
  });
  return { id: meetingId, link: `https://virevos.com/meet/${meetingId}` };
}

export async function markActionItemAdded(
  eventId: string,
  itemIndex: number,
  meetingsDb: MeetingsDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  const id = requireString(eventId, "eventId", MAX_SHORT);
  const idx = requireInt(itemIndex, "itemIndex");

  const [event] = await meetingsDb.getActionItems(id, user.id);

  if (!event?.actionItems) return;

  const updated = event.actionItems.map((item, i) =>
    i === idx ? { ...item, added: true } : item
  );

  await meetingsDb.setActionItems(id, user.id, updated);
}

export async function meetingTranscriptSemanticSearch(
  text: string,
  meetingsDb: MeetingsDB,
  openaiClient: OpenAIClientInterface,
  storage: StorageClientInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return ["Unauthorized"];
  }
  const validText = requireString(text, "text", MAX_MESSAGE);

  const queryEmbedding = await openaiClient.createEmbedding(validText);

  // Get the latest meeting of user from DB
  const [latestEvent] = await meetingsDb.getLatestMeeting(user.id);

  if (!latestEvent) return [];

  const hits = await storage.queryVectors(TRANSCRIPT_BUCKET, TRANSCRIPT_INDEX, {
    queryVector: { float32: queryEmbedding },
    topK: 50,
    filter: { user_id: user.id },
    returnMetadata: true,
  });

  const arr: string[] = [];
  for (const hit of hits) {
    const meta = hit.metadata as
      | { chunk_text?: string; room?: string }
      | undefined;
    if (meta?.chunk_text && meta.room === latestEvent.id) {
      arr.push(meta.chunk_text);
    }
  }
  return arr;
}

/** Returns a signed URL for the meeting's composite recording, or null. */
export async function getRecordingUrl(
  meetingId: string,
  meetingsDb: MeetingsDB,
  storage: StorageClientInterface
): Promise<{ url: string } | null> {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const [meeting] = await meetingsDb.getEventIdForUser(meetingId, user.id);
  if (!meeting) return null;

  const filePath = `recordings/${user.id}/${meetingId}/composite.mp4`;
  const url = await storage.getSignedUrl(RECORDINGS_BUCKET, filePath, 3600);
  return { url };
}

export async function getTranscript(meetingId: string, meetingsDb: MeetingsDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const [meeting] = await meetingsDb.getMeetingStartTime(meetingId, user.id);

  if (!meeting || !meeting.meetingStartTimeEpoch) return null;

  const chunks = await meetingsDb.getTranscriptChunks(meetingId);

  if (chunks.length === 0) return { chunks: [], meetingStartTimeEpoch: null };

  return {
    chunks,
    meetingStartTimeEpoch: meeting.meetingStartTimeEpoch,
  };
}

export type MeetingTokenResult =
  | { outcome: "not-found" }
  | { outcome: "not-started" }
  | { outcome: "ended" }
  | { outcome: "ok"; token: string; meetingTitle: string | null; url: string };

export async function createMeetingToken(
  meetingId: string,
  participantName: string,
  meetingsDb: MeetingsDB,
  livekit: LiveKitClientInterface
): Promise<MeetingTokenResult> {
  const [meeting] = await meetingsDb.getEventByIdUnscoped(meetingId);

  const isAppMeeting = !meeting?.origin || meeting.origin === "app";
  if (!meeting || !meeting.isMeeting || !isAppMeeting) {
    return { outcome: "not-found" };
  }

  const startTime = new Date(meeting.dateTime);
  const endTime = new Date(
    startTime.getTime() + (meeting.duration || 0) * 60000
  );
  const now = new Date();
  if (meeting.status !== "active" && now < startTime) {
    return { outcome: "not-started" };
  }
  if (meeting.status === "ended" || now > endTime) {
    return { outcome: "ended" };
  }

  const roomName = meeting.id;
  const token = await livekit.createToken(participantName, roomName, 600);

  // Dispatch transcription agent once per room (on first participant join)
  try {
    await livekit.dispatchAgent(roomName, "transcription-agent");
  } catch (err) {
    console.error("Failed to dispatch transcription agent:", err);
  }

  return {
    outcome: "ok",
    token,
    meetingTitle: meeting.title ?? null,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL!,
  };
}

// ─── LiveKit webhook handlers ───────────────────────────────────────────────

export async function handleRoomStarted(
  roomName: string,
  meetingsDb: MeetingsDB,
  livekit: LiveKitClientInterface,
  planLimitsDb: PlanLimitsDB,
  billingDb: BillingDB
): Promise<void> {
  await meetingsDb.setRoomStatus(roomName, "active");

  const [meeting] =
    await meetingsDb.getMeetingOwnerWithRecordingStatus(roomName);

  // Throws when the AI limit is hit — the route converts that to an OK
  // response so LiveKit does not retry.
  await assertCanUseAI(meeting.userId, planLimitsDb, billingDb);

  if (meeting?.recordingStatus) {
    try {
      const alreadyRunning = await livekit.hasActiveEgress(roomName);

      if (alreadyRunning) {
        console.log(`Egress already running for room ${roomName}, skipping`);
      } else {
        await livekit.startCompositeEgress(
          roomName,
          `recordings/${meeting.userId}/${roomName}/composite.mp4`
        );
        await meetingsDb.setMeetingStartEpoch(
          roomName,
          Math.floor(Date.now() / 1000)
        );
      }
    } catch (err) {
      console.error("Failed to start composite egress:", err);
    }
  }
}

export async function handleRoomFinished(
  roomName: string,
  finishedAtMs: number,
  roomCreatedAtMs: number,
  meetingsDb: MeetingsDB
): Promise<void> {
  const res = await meetingsDb.getEventByIdUnscoped(roomName);
  if (res.length > 0) {
    const durationInMinutes =
      Number.isFinite(finishedAtMs) && Number.isFinite(roomCreatedAtMs)
        ? Math.max(1, Math.round((finishedAtMs - roomCreatedAtMs) / 60000))
        : res[0].duration;
    await meetingsDb.markRoomFinished(roomName, durationInMinutes);
  }

  const [eventUser] = await meetingsDb.getMeetingOwner(roomName);
  if (eventUser) {
    await meetingsDb.incrementAiCredits(eventUser.userId);
  }
}

/** Post-meeting AI analysis — runs after the webhook response is sent. */
export async function analyzeMeetingTranscript(
  roomName: string,
  meetingsDb: MeetingsDB,
  openaiClient: OpenAIClientInterface
): Promise<void> {
  const chunks = await meetingsDb.getTranscriptChunksFull(roomName);

  if (chunks.length === 0) return;

  const transcriptText = chunks
    .map((c) => `${c.speakerIdentity}: ${c.text}`)
    .join("\n");

  const [meetingOwner] = await meetingsDb.getMeetingOwner(roomName);
  if (!meetingOwner) return;

  const userClients = await meetingsDb.getClientsForUser(meetingOwner.userId);

  const content = await openaiClient.createJsonCompletion(
    "gpt-5",
    `Analyze this meeting transcript and return JSON with fields:
                      summary (2-3 sentences),
                      key_points (string[]),
                      action_items (array of {task, owner, dueDate: YYYY-MM-DD or null, completed: false}),
                      tags (string[]),
                      client_id_guess (integer matching one of the provided client IDs that this meeting is most likely about, or null if uncertain),
                      document_requirements (array of {name, description} listing documents the client needs to provide based on what was discussed, e.g. "Passport", "Form I-94", "OPT EAD card". Empty array if no documents were discussed).

                      Available clients for this user (match by name/email mentioned in transcript): ${JSON.stringify(userClients)}

                      Transcript:
                      ${transcriptText}`
  );

  const analysis = JSON.parse(content) as {
    summary?: string;
    key_points?: string[];
    action_items?: ActionItem[];
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

  await meetingsDb.updateMeetingAnalysis(roomName, {
    aiSummary: analysis.summary,
    key_points: analysis.key_points,
    actionItems: analysis.action_items,
    tags: analysis.tags,
    hasTranscript: true,
    hasNotes: true,
    ...(matchedClientId !== null ? { clientId: matchedClientId } : {}),
  });

  const requirements = (analysis.document_requirements ?? []).filter(
    (d) => d && typeof d.name === "string" && d.name.trim().length > 0
  );

  if (requirements.length > 0) {
    await meetingsDb.insertDocumentRequestWithItems(
      roomName,
      matchedClientId,
      meetingOwner.userId,
      requirements.map((d) => ({
        name: d.name.trim(),
        description: d.description?.trim() || null,
      }))
    );
  }
}

export async function handleEgressEnded(
  roomName: string,
  totalSize: number,
  meetingsDb: MeetingsDB
): Promise<void> {
  if (totalSize > 0) {
    await meetingsDb.creditRecordingStorage(roomName, totalSize);
  }
}

export async function handleParticipantJoined(
  roomName: string,
  identity: string,
  meetingsDb: MeetingsDB
): Promise<void> {
  await meetingsDb.insertAttendee(roomName, identity);
}
