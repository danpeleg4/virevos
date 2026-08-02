import { NextRequest, NextResponse, after } from "next/server";
import { ParticipantInfo_Kind } from "@livekit/protocol";
import { WebhookEvent } from "livekit-server-sdk";
import { planLimitsDrizzle } from "@db/classes/plan_limits_db";
import { billingDrizzle } from "@db/classes/billing_db";
import {
  analyzeMeetingTranscript,
  handleEgressEnded,
  handleParticipantJoined,
  handleRoomFinished,
  handleRoomStarted,
} from "@/lib/workspace/meetings";
import { meetingsDrizzle } from "@db/classes/meetings_db";
import { liveKitClient } from "@/api_client/livekit_client";
import { openAIClient } from "@/api_client/openai_client";

export const maxDuration = 60;

/*
LiveKit webhook
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const authHeader = req.headers.get("Authorization");

  let event: WebhookEvent;
  try {
    event = await liveKitClient.receiveWebhook(body, authHeader ?? undefined);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roomName =
    event?.room?.name ?? event?.room?.sid ?? event?.egressInfo?.roomName;
  if (!roomName) {
    return NextResponse.json({ status: "missing room" }, { status: 400 });
  }

  if (event.event === "room_started") {
    try {
      await handleRoomStarted(
        roomName,
        meetingsDrizzle,
        liveKitClient,
        planLimitsDrizzle,
        billingDrizzle
      );
    } catch (err) {
      console.warn("AI limit reached for room", roomName, err);
      return NextResponse.json({ ok: true }, { status: 200 }); // for webhooks
    }
  }

  if (event.event === "room_finished") {
    const finishedAt = Number(event.createdAt);
    const createdAt = Number(event?.room?.creationTimeMs);
    await handleRoomFinished(roomName, finishedAt, createdAt, meetingsDrizzle);

    after(async () => {
      await analyzeMeetingTranscript(roomName, meetingsDrizzle, openAIClient);
    });
  }

  if (event.event === "egress_ended") {
    const fileResults = event.egressInfo?.fileResults ?? [];
    const totalSize = fileResults.reduce(
      (acc, f) => acc + Number(f.size ?? 0),
      0
    );

    await handleEgressEnded(roomName, totalSize, meetingsDrizzle);

    return NextResponse.json({ status: "ok" });
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
      await handleParticipantJoined(roomName, identity, meetingsDrizzle);
    }
  }

  return NextResponse.json({ status: "ok" });
}
