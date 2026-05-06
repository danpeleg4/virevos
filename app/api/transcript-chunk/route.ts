import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { events, meetingTranscripts } from "@db/schema";
import { eq } from "drizzle-orm";
import {
  TRANSCRIPT_BUCKET,
  TRANSCRIPT_INDEX,
  createEmbedding,
  supabaseVector,
} from "@/lib/embeddings";
import {
  MAX_MESSAGE,
  MAX_SHORT,
  ValidationError,
  requireString,
} from "@/lib/validation";

interface TranscriptChunkBody {
  roomId: string;
  speakerIdentity: string;
  text: string;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.LIVEKIT_API_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let roomId: string;
  let speakerIdentity: string;
  let text: string;
  try {
    const body: TranscriptChunkBody = await req.json();
    roomId = requireString(body.roomId, "roomId", MAX_SHORT);
    speakerIdentity = requireString(
      body.speakerIdentity,
      "speakerIdentity",
      MAX_SHORT
    );
    text = requireString(body.text, "text", MAX_MESSAGE);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const [meeting] = await db
    .select({ userId: events.userId })
    .from(events)
    .where(eq(events.id, roomId));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const { userId } = meeting;

  await db.insert(meetingTranscripts).values({
    meetingId: roomId,
    speakerIdentity,
    text,
  });

  let embedding: number[];
  try {
    embedding = await createEmbedding(text);
  } catch (err) {
    console.error("[transcript-chunk] createEmbedding failed:", err);
    return NextResponse.json({ error: "Embedding failed" }, { status: 502 });
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
    if (error) {
      console.error("[transcript-chunk] putVectors error:", error);
      return NextResponse.json(
        { error: "Vector upload failed", detail: error.message },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[transcript-chunk] putVectors threw:", err);
    return NextResponse.json(
      { error: "Vector upload threw", detail: String(err) },
      { status: 502 }
    );
  }

  return NextResponse.json({ status: "ok" });
}
