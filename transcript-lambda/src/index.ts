import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import os from "os";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";
import { exec } from "child_process";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { db } from "@repo/db/db";
import { events } from "@repo/db/schema";
import { eq } from "drizzle-orm";

/*
This lambda will get triggered when virevos-recording bucket gets a file uploaded
 */
const streamPipeline = promisify(pipeline);
const execAsync = promisify(exec);

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

type Record = {
    id: string;
    chunk_text: string;
    speaker: string;
    start_time: number;
    end_time: number;
    room: string;
    startedAtEpoch: number;
    endedAtEpoch: number;
}

const s3 = new S3Client({ region: process.env.REGION! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

// Returns a YYYY-MM-DD string if valid, otherwise null
function normalizeDueDate(value: unknown): string | null {
    if (!value || typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === "null") return null;
    // Validate YYYY-MM-DD pattern before parsing to avoid timezone shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const d = new Date(trimmed + "T00:00:00Z");
        if (!isNaN(d.getTime())) return trimmed;
    }
    // Fallback: try generic parse and convert to ISO date
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
}

// Helper functions
export async function streamToString(stream: Readable) {
    return new Promise<string>((resolve, reject) => {
        const chunks: any[] = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });
}

async function getJsonFromS3(bucket: string, key: string) {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3.send(command);
    const h = 1

    // response.Body is a readable stream
    const jsonString = await streamToString(response.Body as any);
    return JSON.parse(jsonString);
}

async function waitForMainJson(bucket: string, prefix: string, retries = 5) {
    for (let i = 0; i < retries; i++) {
        const list = await s3.send(
            new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
        );

        const jsonKey = (list.Contents ?? [])
            .map(o => o.Key!)
            .find(k => k.endsWith(".json"));

        if (jsonKey) {
            console.log(`Json Key: \n${jsonKey}`);
            return jsonKey;
        }
        await new Promise(r => setTimeout(r, 3000)); // wait 3s
    }

    throw new Error("Main JSON not found");
}

// Lambda code
export const handler = async (event: any) => {
    const indexName = 'vire-recording';
    const jsonBucket = 'vire-json';

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
        const prefix = key.substring(0, key.lastIndexOf("/") + 1);
        const list = await s3.send(
            new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix,
                Delimiter: "/",
            })
        );

        // retry if no json file arrived yet to S3
        const mainJsonKey = await waitForMainJson(bucket, prefix);
        const json = await getJsonFromS3(bucket, mainJsonKey);
        const mainStartEpoch = json.started_at;
        const mainEpochInSeconds = Math.trunc(Number(mainStartEpoch) / 1e9)

        const folders = list.CommonPrefixes?.map(p => p.Prefix) ?? [];
        const participants: {
            participantName: string | undefined;
            mp4?: string;
            json?: string;
        }[] = [];

        for (const folder of folders) {
            const folderName = folder?.replace(prefix, "").replace("/", ""); // "user1"
            const folderList = await s3.send(
                new ListObjectsV2Command({
                    Bucket: bucket,
                    Prefix: folder,
                })
            );

            const files = (folderList.Contents ?? [])
                .map(o => o.Key!)
                .filter(k => !k.endsWith("/")); // ignore pseudo-folder keys

            const mp4File = files.find(k => k.endsWith(".mp4"));
            const jsonFile = files.find(k => k.endsWith(".json"));

            participants.push({
                participantName: folderName,
                mp4: mp4File,
                json: jsonFile,
            });
        }

        console.log(`Participants length: \n${participants.length}`);
        const parts = key.split("/");
        if (parts[0] !== "recordings") continue;

        const userId = parts[1];
        const roomName = parts[2];
        const index = pc.index(indexName).namespace(userId);

        const tempVideoPath = path.join(os.tmpdir(), path.basename(key));
        const tempAudioPath = tempVideoPath.replace(/\.[^/.]+$/, ".wav");

        const mainJson = []
        try {
            for (const i of participants) {
                // Download MP4 from S3
                const getObj = new GetObjectCommand({ Bucket: bucket, Key: i.mp4 });
                const data = await s3.send(getObj);
                await streamPipeline(data.Body as NodeJS.ReadableStream, fs.createWriteStream(tempVideoPath));

                // Convert MP4 to audio (WAV)
                await execAsync(
                    `ffmpeg -i "${tempVideoPath}" -vn -ac 1 -ar 16000 -y "${tempAudioPath}"`
                );

                const jsonData = await getJsonFromS3(bucket, i.json!);
                const startedAtEpoch = jsonData.started_at
                const startedAtEpochInSeconds = Math.trunc(Number(startedAtEpoch) / 1e9)
                const endedAtEpoch = jsonData.ended_at
                const endedAtEpochInSeconds = Math.trunc(Number(endedAtEpoch) / 1e9)

                // Transcribe audio with diarization
                const transcription = await openai.audio.transcriptions.create({
                    model: "gpt-4o-transcribe-diarize",
                    response_format: "diarized_json",
                    file: fs.createReadStream(tempAudioPath),
                    chunking_strategy: "auto",
                    timestamp_granularities: ["word"]
                }) as DiarizedTranscription;

                const speakerSegments = transcription.segments;

                const allRecords: Record[] = [];
                for (const seg of speakerSegments) {
                    const textChunks = seg.text.match(/.{1,500}(\s|$)/g) || [];
                    for (const chunk of textChunks) {
                        const record: Record = {
                            id: `${roomName}-${uuidv4()}`,
                            chunk_text: chunk.trim(),
                            speaker: i.participantName ?? "Participant",
                            start_time: seg.start,
                            end_time: seg.end,
                            room: roomName,
                            startedAtEpoch: startedAtEpochInSeconds,
                            endedAtEpoch: endedAtEpochInSeconds
                        };
                        allRecords.push(record);
                    }
                }
                mainJson.push(allRecords);
            }

            const flattened = mainJson.flat();
            const sorted = flattened.sort((a, b) => {
                const aStart = a.startedAtEpoch + a.start_time;
                const bStart = b.startedAtEpoch + b.start_time;
                return aStart - bStart;
            });

            // Ensure end_time is never null during mapping
            const normalized = sorted.map(r => {
                const startTime =
                    r.startedAtEpoch + r.start_time - mainEpochInSeconds;

                const endTime =
                    r.startedAtEpoch + r.end_time - mainEpochInSeconds;

                return {
                    ...r,
                    start_time: startTime >= 0 ? startTime : 0,
                    end_time: endTime >= 0 && !isNaN(endTime) ? endTime : startTime,
                };
            });

            await index.upsertRecords(normalized);

            // AI meeting analysis
            const fullTranscript = normalized
                .map(r => `${r.speaker}: ${r.chunk_text}`)
                .join('\n');

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
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : [];

            const actionItems = Array.isArray(analysis.action_items)
                ? analysis.action_items.map((item: any) => ({
                    ...item,
                    dueDate: normalizeDueDate(item.dueDate),
                }))
                : [];

            const tags = Array.isArray(analysis.tags)
                ? analysis.tags
                : [];

            try {
                await db
                    .update(events)
                    .set({
                        ai_summary: analysis.summary ?? "",
                        key_points: keyPoints,
                        action_items: actionItems,
                        tags: tags,
                        hasTranscript: true,
                        hasNotes: true
                    })
                    .where(eq(events.id, roomName));
            } catch (error) {
                console.error(error)
            }

            // Upload JSON to S3
            const jsonKey = `${userId}/${roomName}/${path.basename(key)}.json`;
            await s3.send(new PutObjectCommand({
                Bucket: jsonBucket,
                Key: jsonKey,
                Body: JSON.stringify(normalized, null, 2),
                ContentType: "application/json"
            }));

            console.log(`JSON uploaded to s3://${jsonBucket}/${jsonKey}`);

        } catch (err) {
            console.error(`Error processing ${key}:`, err);
        } finally {
            if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
            if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
        }
    }
};