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

const s3 = new S3Client({ region: process.env.REGION! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export const handler = async (event: any) => {
    const indexName = 'vire-recording';
    const jsonBucket = 'vire-json';

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
        if (!key.match(/\.(mp4)$/i)) continue;

        const parts = key.split("/");

        if (parts.length !== 4) continue;
        if (parts[0] !== "recordings") continue;
        if (!parts[3].endsWith(".mp4")) continue;

        const userId = parts[1];
        const roomName = parts[2];
        const index = pc.index(indexName).namespace(userId);

        const tempVideoPath = path.join(os.tmpdir(), path.basename(key));
        const tempAudioPath = tempVideoPath.replace(/\.[^/.]+$/, ".wav");

        try {
            // Download MP4 from S3
            const getObj = new GetObjectCommand({ Bucket: bucket, Key: key });
            const data = await s3.send(getObj);
            await streamPipeline(data.Body as NodeJS.ReadableStream, fs.createWriteStream(tempVideoPath));

            // Convert MP4 to audio (WAV)
            await execAsync(
                `ffmpeg -i "${tempVideoPath}" -vn -ac 1 -ar 16000 -y "${tempAudioPath}"`
            );

            // Transcribe audio with diarization
            const transcription = await openai.audio.transcriptions.create({
                model: "gpt-4o-transcribe-diarize",
                response_format: "diarized_json",
                file: fs.createReadStream(tempAudioPath),
                chunking_strategy: "auto",
                timestamp_granularities: ["word"]
            }) as DiarizedTranscription;

            const speakerSegments = transcription.segments;

            const allRecords: any[] = [];
            const structuredJson: any[] = [];

            for (const seg of speakerSegments) {
                const textChunks = seg.text.match(/.{1,500}(\s|$)/g) || [];
                for (const chunk of textChunks) {
                    const record = {
                        id: `${roomName}-${uuidv4()}`,
                        chunk_text: chunk.trim(),
                        speaker: seg.speaker,
                        start_time: seg.start,
                        end_time: seg.end,
                        room: roomName,
                    };
                    allRecords.push(record);
                    structuredJson.push(record);
                }
            }

            // Upsert into Pinecone
            await index.upsertRecords(allRecords);

            // Upload JSON to S3
            const jsonKey = `${userId}/${roomName}/${path.basename(key)}.json`;
            await s3.send(new PutObjectCommand({
                Bucket: jsonBucket,
                Key: jsonKey,
                Body: JSON.stringify(structuredJson, null, 2),
                ContentType: "application/json"
            }));

            console.log(`Processed ${key}: ${structuredJson.length} chunks`);
            console.log(`JSON uploaded to s3://${jsonBucket}/${jsonKey}`);

        } catch (err) {
            console.error(`Error processing ${key}:`, err);
        } finally {
            if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
            if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
        }
    }
};
