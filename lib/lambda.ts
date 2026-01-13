import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import os from "os";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";

const streamPipeline = promisify(pipeline);

const s3 = new S3Client({ region: process.env.REGION! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export const handler = async (event: any) => {
    console.log("S3 Event:", JSON.stringify(event, null, 2));
    const indexName = process.env.PINECONE_INDEX || 'vire-recording';

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
        if (!key.match(/\.(ogg)$/i)) {
            console.log(`Skipping non-audio file: ${key}`);
            continue;
        }
        const parts = key.split("/");

        if (parts.length < 4) {
            console.error("Unexpected S3 key format:", key);
            continue;
        }

        const userId = parts[1];
        const roomName = parts[2] ?? "unknown-room";
        const index = pc.index(indexName).namespace(userId);

        console.log(`Starting processing file ${key} at ${new Date().toISOString()}`);
        const tempInput = path.join(os.tmpdir(), path.basename(key));

        try {
            // Download file from S3
            const getObj = new GetObjectCommand({ Bucket: bucket, Key: key });
            const data = await s3.send(getObj);
            await streamPipeline(data.Body as NodeJS.ReadableStream, fs.createWriteStream(tempInput));

            // Transcribe audio
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempInput),
                model: "whisper-1"
            });

            console.log(`Transcription for ${key}:`, transcription.text);

            // Chunk text
            const chunks = transcription.text.match(/.{1,500}/g) || [];

            await index.upsertRecords(
                chunks.map(chunk => ({
                    id: `${roomName}-${uuidv4()}`,
                    chunk_text: chunk,
                    room: roomName,
                }))
            );

            console.log({ roomName, chunks: chunks.length });
            console.log(`Processed ${key} successfully!`);

        } catch (err) {
            console.error(`Error processing file ${key}:`, err);
        } finally {
            if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        }
    }
};
