import { NextRequest, NextResponse } from "next/server";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { events } from "@db/schema";
import { db } from "@db/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export async function POST(req: NextRequest) {
  const { meetingId, name } = await req.json();
  if (!meetingId) {
    return NextResponse.json(
      { error: "meetingId is required" },
      { status: 400 }
    );
  }

  const [meeting] = await db
    .select()
    .from(events)
    .where(eq(events.id, meetingId));

  const isAppMeeting = !meeting?.origin || meeting.origin === "app";
  if (!meeting || !meeting.isMeeting || !isAppMeeting) {
    return notFound();
  }

  const participantName = name;
  if (!participantName) {
    return NextResponse.json(
      { error: "identity (name) is required" },
      { status: 400 }
    );
  }

  const startTime = new Date(meeting.dateTime);
  const endTime = new Date(
    startTime.getTime() + (meeting.duration || 0) * 60000
  );
  const now = new Date();
  if (meeting.status !== "active" && now < startTime) {
    return NextResponse.json(
      { error: "Meeting has not started yet" },
      { status: 403 }
    );
  }
  if (meeting.status === "ended" || now > endTime) {
    return NextResponse.json({ error: "Meeting has ended" }, { status: 410 });
  }

  const roomName = meeting.id;

  // Create the token
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: participantName,
      ttl: 600, // 10 minutes
    }
  );
  at.addGrant({ roomJoin: true, room: roomName });
  const token = await at.toJwt();
  const meetingTitle = await db
    .select({
      title: events.title,
    })
    .from(events)
    .where(eq(events.id, roomName));

  // Dispatch transcription agent once per room (on first participant join)
  try {
    // AgentDispatchClient requires https:// host, not wss://
    const livekitHost = (process.env.LIVEKIT_HOST ??
      process.env.NEXT_PUBLIC_LIVEKIT_URL)!.replace(/^wss?:\/\//, "https://");
    const dispatchClient = new AgentDispatchClient(
      livekitHost,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );
    await dispatchClient.createDispatch(roomName, "transcription-agent");
  } catch (err) {
    console.error("Failed to dispatch transcription agent:", err);
  }

  return NextResponse.json({
    token,
    meetingTitle: meetingTitle[0]?.title,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
  });
}
