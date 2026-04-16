import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";
import ffmpegPath from "ffmpeg-static";
import { db } from "@db/db";
import { events, meetingAttendees } from "@db/schema";
import { eq, sql} from "drizzle-orm";
import {
  supabaseAdmin,
  RECORDINGS_BUCKET,
  TRANSCRIPTS_BUCKET,
} from "@/lib/supabase";

// TODO After upgraded vercel plan to change the maxDuration to a higher number
export const maxDuration = 299;
export const runtime = "nodejs";

const execAsync = promisify(exec);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

type DiarizedSegment = {
  speaker: string;
  start: number;
  end: number;
  text: string;
};

type DiarizedTranscription = {
  text: string;
  segments: DiarizedSegment[];
};

type TranscriptRecord = {
  id: string;
  chunk_text: string;
  speaker: string;
  start_time: number;
  end_time: number;
  room: string;
  startedAtEpoch: number;
  endedAtEpoch: number;
};

type ActionItem = {
  task: string;
  owner: string;
  dueDate: string | null;
  completed: boolean;
};

export function normalizeDueDate(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed + "T00:00:00Z");
    if (!isNaN(d.getTime())) return trimmed;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

async function waitForAllParticipants(
  userId: string,
  roomId: string,
  expectedCount: number,
  retries = 8,
  delayMs = 3000
): Promise<boolean> {
  const prefix = `recordings/${userId}/${roomId}`;
  for (let i = 0; i < retries; i++) {
    const { data: topLevel } = await supabaseAdmin.storage
      .from(RECORDINGS_BUCKET)
      .list(prefix, { limit: 100 });

    const folders = (topLevel ?? []).filter((f) => !f.name.includes("."));
    let readyCount = 0;
    for (const folder of folders) {
      const { data: files } = await supabaseAdmin.storage
        .from(RECORDINGS_BUCKET)
        .list(`${prefix}/${folder.name}`);
      if ((files ?? []).some((f) => f.name.endsWith(".json"))) {
        readyCount++;
      }
    }
    if (readyCount >= expectedCount) return true;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const filePath: string = payload?.record?.name ?? "";

  // Only process .json metadata files that indicate a recording is complete
  if (!filePath.endsWith(".json")) {
    return NextResponse.json({ status: "skipped" });
  }

  // Path structure for participant egress: recordings/{userId}/{roomId}/{identity}/file.json
  const parts = filePath.split("/");
  if (parts[0] !== "recordings" || parts.length < 5) {
    return NextResponse.json({ status: "skipped" });
  }

  const userId = parts[1];
  const roomId = parts[2];
  const indexName = "vire-recording";
  const index = pc.index(indexName).namespace(userId);

  // Guard against duplicate processing when multiple participant JSONs upload
  const [dbEvent] = await db
    .select()
    .from(events)
    .where(eq(events.id, roomId));
  if (!dbEvent) {
    return NextResponse.json({ status: "skipped" });
  }
  if (dbEvent.hasTranscript) {
    return NextResponse.json({ status: "already processed" });
  }

  // Wait for all participant recordings to finish uploading before processing.
  const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(meetingAttendees)
      .where(eq(meetingAttendees.meetingId, roomId));

  const expectedCount = result[0].count;

  const allReady = await waitForAllParticipants(
    userId,
    roomId,
    expectedCount
  );
  if (!allReady) {
    // Another participant JSON will re-trigger this webhook; bail out for now.
    return NextResponse.json({ status: "waiting for other participants" });
  }

  // List participant folders
  const { data: topLevel } = await supabaseAdmin.storage
    .from(RECORDINGS_BUCKET)
    .list(`recordings/${userId}/${roomId}`, { limit: 100 });

  const participantFolders = (topLevel ?? []).filter(
    (f) => !f.name.includes(".")
  );

  const participants: {
    participantName: string;
    mp4?: string;
    json?: string;
  }[] = [];

  for (const folder of participantFolders) {
    const folderPath = `recordings/${userId}/${roomId}/${folder.name}`;
    const { data: folderFiles } = await supabaseAdmin.storage
      .from(RECORDINGS_BUCKET)
      .list(folderPath);

    const mp4File = (folderFiles ?? []).find((f) => f.name.endsWith(".mp4"));
    const jsonFile = (folderFiles ?? []).find((f) => f.name.endsWith(".json"));

    participants.push({
      participantName: folder.name,
      mp4: mp4File ? `${folderPath}/${mp4File.name}` : undefined,
      json: jsonFile ? `${folderPath}/${jsonFile.name}` : undefined,
    });
  }

  const allRecordGroups: TranscriptRecord[][] = [];
  const tempFiles: string[] = [];

  try {
    for (const participant of participants) {
      if (!participant.mp4 || !participant.json) continue;

      const tempVideoPath = path.join(os.tmpdir(), `${uuidv4()}.mp4`);
      const tempAudioPath = tempVideoPath.replace(".mp4", ".wav");
      tempFiles.push(tempVideoPath, tempAudioPath);

      // Download MP4 from Supabase Storage
      const { data: mp4Blob, error: mp4Error } = await supabaseAdmin.storage
        .from(RECORDINGS_BUCKET)
        .download(participant.mp4);
      if (mp4Error || !mp4Blob) {
        console.error("Failed to download MP4:", mp4Error?.message);
        continue;
      }
      const mp4Buffer = Buffer.from(await mp4Blob.arrayBuffer());
      fs.writeFileSync(tempVideoPath, mp4Buffer);

      // Convert MP4 to WAV using ffmpeg-static binary
      await execAsync(
        `"${ffmpegPath}" -i "${tempVideoPath}" -vn -ac 1 -ar 16000 -y "${tempAudioPath}"`
      );

      // Get participant JSON metadata
      let startedAtEpochInSeconds: number = 0;
      let endedAtEpochInSeconds: number = 0;
      if (participant.json) {
        const { data: pJsonBlob } = await supabaseAdmin.storage
          .from(RECORDINGS_BUCKET)
          .download(participant.json);
        if (pJsonBlob) {
          const pJson = JSON.parse(await pJsonBlob.text());
          startedAtEpochInSeconds = Math.trunc(Number(pJson.started_at) / 1e9);
          endedAtEpochInSeconds = Math.trunc(Number(pJson.ended_at) / 1e9);
        }
        else {
          return NextResponse.json({ status: "no json file found" });
        }
      }

      // Transcribe with OpenAI
      const transcription = (await openai.audio.transcriptions.create({
        model: "gpt-4o-transcribe-diarize",
        response_format: "diarized_json",
        file: fs.createReadStream(tempAudioPath),
        chunking_strategy: "auto",
        timestamp_granularities: ["word"],
      })) as DiarizedTranscription;

      const records: TranscriptRecord[] = [];
      for (const seg of transcription.segments) {
        const textChunks = seg.text.match(/.{1,500}(\s|$)/g) ?? [];
        for (const chunk of textChunks) {
          records.push({
            id: `${roomId}-${uuidv4()}`,
            chunk_text: chunk.trim(),
            speaker: participant.participantName,
            start_time: seg.start,
            end_time: seg.end,
            room: roomId,
            startedAtEpoch: startedAtEpochInSeconds,
            endedAtEpoch: endedAtEpochInSeconds,
          });
        }
      }
      allRecordGroups.push(records);
    }

    const flattened = allRecordGroups.flat();

    // Use the earliest actual recording start as the baseline so transcript
    // timestamps align with video position 0 (when the first participant joined).
    const mainEpochInSeconds = Math.min(...flattened.map((r) => r.startedAtEpoch))

    const sorted = flattened.sort(
      (a, b) =>
        a.startedAtEpoch + a.start_time - (b.startedAtEpoch + b.start_time)
    );
    const normalized = sorted.map((r) => {
      const startTime = r.startedAtEpoch + r.start_time - mainEpochInSeconds;
      const endTime = r.startedAtEpoch + r.end_time - mainEpochInSeconds;
      return {
        ...r,
        start_time: startTime >= 0 ? startTime : 0,
        end_time: endTime >= 0 && !isNaN(endTime) ? endTime : startTime,
      };
    });

    if (normalized.length > 0) {
      await index.upsertRecords(normalized);
    }

    // AI meeting analysis
    const fullTranscript = normalized
      .map((r) => `${r.speaker}: ${r.chunk_text}`)
      .join("\n");

    if (!fullTranscript) {
      return NextResponse.json({ status: "ok", note: "no transcript content" });
    }

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze this meeting transcript. Respond with JSON:
{
  "summary": "2-3 sentence meeting summary",
  "key_points": ["point 1", "point 2", ...],
  "action_items": [
    { "task": "...", "owner": "...", "dueDate": "YYYY-MM-DD", "completed": false }
  ],
  "tags": ["tag 1", "tag 2", ...],
}
Rules for dueDate:
- Use ISO 8601 format: "YYYY-MM-DD" (e.g., "2026-03-15")
- Only set a date if explicitly mentioned in the transcript
- If the date is unclear, relative without a clear anchor, or not mentioned, use null`,
        },
        { role: "user", content: fullTranscript },
      ],
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(aiResponse.choices[0].message.content!);

    const rawKeyPoints = analysis.key_points ?? [];
    const keyPoints: string[] = Array.isArray(rawKeyPoints)
      ? rawKeyPoints
          .filter((v): v is string => typeof v === "string")
          .map((s) => s.trim())
          .filter(Boolean)
      : typeof rawKeyPoints === "string"
        ? rawKeyPoints
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];

    const actionItems = Array.isArray(analysis.action_items)
      ? analysis.action_items.map((item: ActionItem) => ({
          ...item,
          dueDate: normalizeDueDate(item.dueDate),
        }))
      : [];

    const tags = Array.isArray(analysis.tags) ? analysis.tags : [];

    try {
      await db
        .update(events)
        .set({
          ai_summary: analysis.summary ?? "",
          key_points: keyPoints,
          action_items: actionItems,
          tags,
          hasTranscript: true,
          hasNotes: true,
        })
        .where(eq(events.id, roomId));
    } catch (dbErr) {
      console.error("DB update failed:", dbErr);
    }

    // Upload transcript JSON to Supabase
    const jsonKey = `${userId}/${roomId}/transcript.json`;
    const jsonBuffer = Buffer.from(JSON.stringify(normalized, null, 2));
    const { error: uploadError } = await supabaseAdmin.storage
      .from(TRANSCRIPTS_BUCKET)
      .upload(jsonKey, jsonBuffer, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload transcript JSON:", uploadError.message);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Error processing recording:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  } finally {
    for (const f of tempFiles) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }
}
