import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { db } from "@db/db";
import { events, meetingTranscripts } from "@db/schema";
import { eq } from "drizzle-orm";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

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
  //console.log("body", body);
  //console.log(roomId, speakerIdentity, text);

  if (!roomId || !speakerIdentity || !text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

  await pc.index("vire-recording").namespace(userId).upsertRecords([
    {
      id: `${roomId}-${crypto.randomUUID()}`,
      chunk_text: text,
      speaker: speakerIdentity,
      room: roomId,
      startedAtEpoch: Date.now(),
    },
  ]);

  return NextResponse.json({ status: "ok" });
}
