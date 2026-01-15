"use server"

import fetch from "node-fetch";
import { AccessToken } from "livekit-server-sdk";
import { Pinecone } from '@pinecone-database/pinecone'

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
    const token = await createRoomCreateToken();

    const res = await fetch(
        "https://virevos-sn3m4ofa.livekit.cloud/twirp/livekit.RoomService/CreateRoom",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
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
            }),
        }
    );

    if (!res.ok && res.status !== 409) {
        throw new Error(await res.text());
    }
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
