"use server"

import { AccessToken } from "livekit-server-sdk";
import { Pinecone } from '@pinecone-database/pinecone'
import {db} from "@/db/db";
import {meetings} from "@/db/schema";
import axios from "axios";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

async function createRoomCreateToken() {
    const at = new AccessToken(
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!,
        {
            ttl: 60, // short-lived
        }
    );

    at.addGrant({
        roomCreate: true,
    });

    return await at.toJwt();
}

export async function createRoom(roomName: string, userId?: string) {
    if (!userId) {
        return "user is required"
    }
    const token = await createRoomCreateToken();

    const res = await axios.post(
        "https://virevos-sn3m4ofa.livekit.cloud/twirp/livekit.RoomService/CreateRoom",
        {
            name: roomName,
            egress: {
                tracks: {
                    filepath: `recordings/${userId}/${roomName}/`,
                    s3: {
                        access_key: process.env.AWS_S3_ACCESS_KEY,
                        secret: process.env.AWS_S3_SECRET_KEY,
                        bucket: "virevos-recordings",
                        region: "us-east-1",
                    },
                },
            },
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );

    const data = res.data;
    const time = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    if (res.status !== 200 && res.status !== 409) {
        throw new Error(res.statusText);
    }
    await db
        .insert(meetings)
        .values({
            id: data.sid,
            title: roomName,
            date: new Date().toISOString(),
            origin: "app",
            time: time,
            duration: 60,
            type: "In-App",
            status: "active",
            userId: userId
        })
        .onConflictDoUpdate({
            target: meetings.id,
            set: {
                id: data.sid,
                title: roomName,
                date: new Date().toISOString(),
                origin: "app",
                time: time,
                duration: 60,
                type: "In-App",
                status: "active",
                userId: userId
            },
        });
    return "success"
}

export async function getPastMeetingTranscript(
    text: string,
    userId: string
) {
    const indexName = 'vire-recording';
    const index = pc.index(indexName).namespace(userId);

    const results = await index.searchRecords({
        query: {
            topK: 10,
            inputs: { text },
        },
    });

    const arr: string[] = [];

    results.result.hits.forEach((hit) => {
        const fields = hit.fields as { chunk_text?: string };

        if (fields.chunk_text) {
            arr.push(fields.chunk_text);
        }
    });

    return arr;
}
