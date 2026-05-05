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

  const body: TranscriptChunkBody = await req.json();
  const { roomId, speakerIdentity, text } = body;

  if (!roomId || !speakerIdentity || !text) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
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

  const embedding = await createEmbedding(text);

  await supabaseVector.storage.vectors
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
            started_epoch: Date.now(),
          },
        },
      ],
    });

  return NextResponse.json({ status: "ok" });
}
