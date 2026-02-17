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

    // response.Body is a readable stream
    const jsonString = await streamToString(response.Body as any);
    const data = JSON.parse(jsonString);

    return data;
}

async function waitForMainJson(bucket: string, prefix: string, retries = 5) {
    for (let i = 0; i < retries; i++) {
        const list = await s3.send(
            new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
        );

        const jsonKey = (list.Contents ?? [])
            .map(o => o.Key!)
            .find(k => k.endsWith(".json") && !k.slice(prefix.length).includes("/"));

        if (jsonKey) return jsonKey;
        await new Promise(r => setTimeout(r, 3000)); // wait 3s
    }

    throw new Error("Main JSON not found");
}

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

        const mainJsonKey = await waitForMainJson(bucket, prefix);
        const json = await getJsonFromS3(bucket, mainJsonKey);
        const mainStartEpoch = json.start_time;

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
                const endedAtEpoch = jsonData.ended_at

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
                            end_time: seg.end ?? seg.start,
                            room: roomName,
                            startedAtEpoch: startedAtEpoch,
                            endedAtEpoch: endedAtEpoch
                        };
                        allRecords.push(record);
                    }
                }
                mainJson.push(allRecords);
            }

            const flattened = mainJson.flat();
            const sorted = flattened.sort((a, b) => {
                const aStart = a.startedAtEpoch + a.start_time * 1000;
                const bStart = b.startedAtEpoch + b.start_time * 1000;
                return aStart - bStart;
            });

            // Ensure end_time is never null during mapping
            const normalized = sorted.map(r => {
                const startTime = (r.startedAtEpoch + r.start_time * 1000 - mainStartEpoch) / 1000;
                const endTime = (r.startedAtEpoch + r.end_time * 1000 - mainStartEpoch) / 1000;

                return {
                    ...r,
                    start_time: startTime || 0, // Fallback to 0 if NaN/null
                    end_time: (endTime !== null && !isNaN(endTime)) ? endTime : startTime
                };
            });

            const sanitizeMetadata = (records: any[]) => {
                return records.map(record => {
                    const cleanRecord = { ...record };
                    Object.keys(cleanRecord).forEach(key => {
                        if (cleanRecord[key] === null || cleanRecord[key] === undefined) {
                            delete cleanRecord[key];
                        }
                    });
                    return cleanRecord;
                });
            };

            await index.upsertRecords(sanitizeMetadata(normalized));

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
