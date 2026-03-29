import { NextRequest, NextResponse } from "next/server";
import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodingOptionsPreset,
  RoomServiceClient,
} from "livekit-server-sdk";
import { events, users } from "@db/schema";
import { db } from "@db/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

const livekitHost = process.env.LIVEKIT_HOST;
const roomService = new RoomServiceClient(
  livekitHost!,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);
const egressClient = new EgressClient(livekitHost!);

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

  const [userStatus] = await db
    .select({
      recordingStatus: users.recordingStatus,
    })
    .from(users)
    .where(eq(users.user_id, meeting.userId));

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
  if (now < startTime) {
    return NextResponse.json(
      { error: "Meeting has not started yet" },
      { status: 403 }
    );
  }
  if (now > endTime) {
    return NextResponse.json({ error: "Meeting has ended" }, { status: 410 });
  }

  const roomName = meeting.id;
  let room = (await roomService.listRooms([roomName]))[0];
  let shouldStartRecording = false;

  if (!room) {
    try {
      room = await roomService.createRoom({
        name: roomName,
        emptyTimeout: 60,
        maxParticipants: 20,
      });
      shouldStartRecording = true;
    } catch (error) {
      room = (await roomService.listRooms([roomName]))[0];
    }
  }

  if (shouldStartRecording && room && userStatus.recordingStatus) {
    const outputs = {
      file: new EncodedFileOutput({
        filepath: `recordings/${meeting.userId}/${meeting.id}/main.mp4`,
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

    await egressClient.startRoomCompositeEgress(roomName, outputs, {
      layout: "grid",
      encodingOptions: EncodingOptionsPreset.H264_1080P_30,
      audioOnly: false,
    });
  }

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

  return NextResponse.json({
    token,
    meetingTitle: meetingTitle[0]?.title,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
  });
}
