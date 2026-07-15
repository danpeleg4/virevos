import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import {
  MAX_NAME,
  MAX_SHORT,
  ValidationError,
  requireString,
} from "@/lib/util/validation";
import { rateLimit } from "@/lib/util/rate_limit";
import { createMeetingToken } from "@/lib/workspace/meetings";
import { meetingsDrizzle } from "@db/meetings_db";
import { liveKitClient } from "@/api_client/livekit_client";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, {
    keyPrefix: "token",
    windowMs: 60_000,
    max: 10,
  });
  if (limited) return limited;

  let meetingId: string;
  let participantName: string;
  try {
    const body = await req.json();
    meetingId = requireString(body.meetingId, "meetingId", MAX_SHORT);
    participantName = requireString(body.name, "name", MAX_NAME);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await createMeetingToken(
    meetingId,
    participantName,
    meetingsDrizzle,
    liveKitClient
  );

  if (result.outcome === "not-found") return notFound();
  if (result.outcome === "not-started") {
    return NextResponse.json(
      { error: "Meeting has not started yet" },
      { status: 403 }
    );
  }
  if (result.outcome === "ended") {
    return NextResponse.json({ error: "Meeting has ended" }, { status: 410 });
  }

  return NextResponse.json({
    token: result.token,
    meetingTitle: result.meetingTitle,
    url: result.url,
  });
}
