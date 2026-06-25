import {
  cli,
  defineAgent,
  type JobContext,
  type JobProcess,
  ServerOptions,
  stt as sttLib,
} from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import * as silero from "@livekit/agents-plugin-silero";
import OpenAI from "openai";
import {
  AudioStream,
  ParticipantKind,
  type RemoteAudioTrack,
  type RemoteParticipant,
  RoomEvent,
  TrackKind,
  TrackSource,
} from "@livekit/rtc-node";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import * as schema from "../../../db/schema";
import { createClient } from "@supabase/supabase-js";
import { events, meetingTranscripts } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

dotenv.config();

const EMBEDDING_MODEL = "text-embedding-3-large";
const TRANSCRIPT_BUCKET = "recording";
const TRANSCRIPT_INDEX = "transcription";

// Lazy init: top-level module load also happens during `download-files`, where
// env vars aren't available. Defer construction until entry() runs.
let openaiClient!: OpenAI;
let supabaseVector!: ReturnType<typeof createClient>;
let initPromise: Promise<void> | null = null;
let db!: ReturnType<typeof drizzle<typeof schema>>;

function initServices(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      supabaseVector = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_API_SECRET!
      );
      const sql = postgres(process.env.DATABASE_URL!, {
        ssl: process.env.NODE_ENV === "production" ? "require" : false,
      });
      db = drizzle(sql, { schema });
    })();
  }
  return initPromise;
}

async function transcribeParticipant(
  ctx: JobContext,
  participant: RemoteParticipant,
  track: RemoteAudioTrack,
  vad: silero.VAD
): Promise<void> {
  const sttInstance = new openai.STT({
    model: "gpt-realtime-whisper",
    useRealtime: true,
    vad,
  });

  const sttStream = sttInstance.stream();
  const audioStream = new AudioStream(track);
  sttStream.updateInputStream(audioStream);

  for await (const event of sttStream) {
    if (
      event.type === sttLib.SpeechEventType.FINAL_TRANSCRIPT &&
      event.alternatives?.[0]?.text
    ) {
      const roomId = ctx.room.name;
      if (!roomId) throw new Error("Not room found");
      const speakerIdentity = participant.identity;
      const text = event.alternatives[0].text;
      const [meeting] = await db
        .select()
        .from(events)
        .where(eq(events.id, roomId));
      const { userId } = meeting;
      await db.insert(meetingTranscripts).values({
        meetingId: meeting.id,
        speakerIdentity: speakerIdentity,
        text: event.alternatives[0].text,
      });

      let embedding: number[] = [];
      try {
        const res = await openaiClient.embeddings.create({
          model: EMBEDDING_MODEL,
          input: text,
        });
        embedding = res.data[0].embedding;
      } catch (e) {
        console.error("[transcript-chunk] createEmbedding failed:", e);
      }

      try {
        const { error } = await supabaseVector.storage.vectors
          .from(TRANSCRIPT_BUCKET)
          .index(TRANSCRIPT_INDEX)
          .putVectors({
            vectors: [
              {
                key: `${roomId}-${crypto.randomUUID()}`,
                data: { float32: embedding },
                metadata: {
                  chunk_text: text,
                  speaker: speakerIdentity,
                  room: roomId,
                  user_id: userId,
                  started_epoch: new Date(),
                },
              },
            ],
          });
        if (error) console.error("[transcript-chunk] putVectors error:", error);
      } catch (err) {
        console.error("Failed to save transcript chunk:", err);
      }
    }
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },

  entry: async (ctx: JobContext) => {
    await initServices();
    await ctx.connect();

    const vad = ctx.proc.userData.vad as silero.VAD;

    // Track which audio track SIDs are already being transcribed to avoid duplicates.
    const activeTracks = new Set<string>();

    const startTranscription = (
      participant: RemoteParticipant,
      track: RemoteAudioTrack
    ) => {
      const trackSid = track.sid;
      if (!trackSid || activeTracks.has(trackSid)) return;
      activeTracks.add(trackSid);

      transcribeParticipant(ctx, participant, track, vad)
        .catch((err) => {
          console.error(
            `Transcription error for ${participant.identity}:`,
            err
          );
        })
        .finally(() => {
          activeTracks.delete(trackSid);
        });
    };

    // Handle participants already in the room when the agent joins.
    for (const [, participant] of ctx.room.remoteParticipants) {
      if (
        participant.kind === ParticipantKind.AGENT ||
        participant.kind === ParticipantKind.EGRESS
      )
        continue;
      for (const [, publication] of participant.trackPublications) {
        if (
          publication.kind === TrackKind.KIND_AUDIO &&
          publication.source === TrackSource.SOURCE_MICROPHONE &&
          publication.track != null
        ) {
          startTranscription(
            participant,
            publication.track as RemoteAudioTrack
          );
        }
      }
    }

    // Handle tracks that arrive after the agent joins.
    ctx.room.on(
      RoomEvent.TrackSubscribed,
      (track, publication, participant) => {
        if (participant.kind === ParticipantKind.AGENT) return;
        if (track.kind !== TrackKind.KIND_AUDIO) return;
        if (publication.source !== TrackSource.SOURCE_MICROPHONE) return;
        startTranscription(participant, track as RemoteAudioTrack);
      }
    );

    // Keep the agent alive until the room disconnects.
    await new Promise<void>((resolve) => {
      ctx.room.on(RoomEvent.Disconnected, () => resolve());
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
  })
);
