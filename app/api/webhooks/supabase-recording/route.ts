import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import { exec } from "child_process";
import { Readable } from "stream";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";
import ffmpegPath from "ffmpeg-static";
import { db } from "@db/db";
import { events } from "@db/schema";
import { eq } from "drizzle-orm";
import { supabaseAdmin, RECORDINGS_BUCKET, TRANSCRIPTS_BUCKET } from "@/lib/supabase";

export const maxDuration = 800;
export const runtime = "nodejs";

const streamPipeline = promisify(pipeline);
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

async function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

async function waitForMainJson(
  userId: string,
  roomName: string,
  retries = 5
): Promise<string | null> {
  const prefix = `recordings/${userId}/${roomName}`;
  for (let i = 0; i < retries; i++) {
    const { data } = await supabaseAdmin.storage
      .from(RECORDINGS_BUCKET)
      .list(prefix);
    const jsonFile = (data ?? []).find((f) => f.name.endsWith(".json"));
    if (jsonFile) return `${prefix}/${jsonFile.name}`;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
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

  // Path structure: recordings/{userId}/{roomName}/...
  const parts = filePath.split("/");
  if (parts[0] !== "recordings" || parts.length < 3) {
    return NextResponse.json({ status: "skipped" });
  }

  const userId = parts[1];
  const roomName = parts[2];
  const indexName = "vire-recording";
  const index = pc.index(indexName).namespace(userId);

  // Get main JSON metadata
  const mainJsonPath = await waitForMainJson(userId, roomName);
  if (!mainJsonPath) {
    console.error("Main JSON not found for", roomName);
    return NextResponse.json({ error: "Main JSON not found" }, { status: 500 });
  }

  const { data: mainJsonBlob, error: mainJsonError } = await supabaseAdmin.storage
    .from(RECORDINGS_BUCKET)
    .download(mainJsonPath);
  if (mainJsonError || !mainJsonBlob) {
    return NextResponse.json({ error: "Failed to download main JSON" }, { status: 500 });
  }
  const mainJson = JSON.parse(await mainJsonBlob.text());
  const mainStartEpoch = mainJson.started_at;
  const mainEpochInSeconds = Math.trunc(Number(mainStartEpoch) / 1e9);

  // List participant folders
  const { data: topLevel } = await supabaseAdmin.storage
    .from(RECORDINGS_BUCKET)
    .list(`recordings/${userId}/${roomName}`, { limit: 100 });

  const participantFolders = (topLevel ?? []).filter((f) => !f.name.includes("."));

  const participants: {
    participantName: string;
    mp4?: string;
    json?: string;
  }[] = [];

  for (const folder of participantFolders) {
    const folderPath = `recordings/${userId}/${roomName}/${folder.name}`;
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
      if (!participant.mp4) continue;

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
      let startedAtEpochInSeconds = mainEpochInSeconds;
      let endedAtEpochInSeconds = mainEpochInSeconds;
      if (participant.json) {
        const { data: pJsonBlob } = await supabaseAdmin.storage
          .from(RECORDINGS_BUCKET)
          .download(participant.json);
        if (pJsonBlob) {
          const pJson = JSON.parse(await pJsonBlob.text());
          startedAtEpochInSeconds = Math.trunc(Number(pJson.started_at) / 1e9);
          endedAtEpochInSeconds = Math.trunc(Number(pJson.ended_at) / 1e9);
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
            id: `${roomName}-${uuidv4()}`,
            chunk_text: chunk.trim(),
            speaker: participant.participantName,
            start_time: seg.start,
            end_time: seg.end,
            room: roomName,
            startedAtEpoch: startedAtEpochInSeconds,
            endedAtEpoch: endedAtEpochInSeconds,
          });
        }
      }
      allRecordGroups.push(records);
    }

    const flattened = allRecordGroups.flat();
    const sorted = flattened.sort(
      (a, b) => a.startedAtEpoch + a.start_time - (b.startedAtEpoch + b.start_time)
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

    await index.upsertRecords(normalized);

    // AI meeting analysis
    const fullTranscript = normalized
      .map((r) => `${r.speaker}: ${r.chunk_text}`)
      .join("\n");

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
      ? rawKeyPoints.filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean)
      : typeof rawKeyPoints === "string"
      ? rawKeyPoints.split(",").map((s: string) => s.trim()).filter(Boolean)
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
        .where(eq(events.id, roomName));
    } catch (dbErr) {
      console.error("DB update failed:", dbErr);
    }

    // Upload transcript JSON to Supabase
    const jsonKey = `${userId}/${roomName}/transcript.json`;
    const jsonBuffer = Buffer.from(JSON.stringify(normalized, null, 2));
    const { error: uploadError } = await supabaseAdmin.storage
      .from(TRANSCRIPTS_BUCKET)
      .upload(jsonKey, jsonBuffer, { contentType: "application/json", upsert: true });

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
