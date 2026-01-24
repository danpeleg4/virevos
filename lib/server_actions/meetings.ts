"use server"

import {
    AccessToken,
    EgressClient,
    EncodedFileOutput,
    EncodingOptionsPreset,
} from "livekit-server-sdk";
import { Pinecone } from '@pinecone-database/pinecone'
import { db } from "@/db/db";
import {meetings} from "@/db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Room, RoomServiceClient } from 'livekit-server-sdk';

const livekitHost = 'https://virevos-sn3m4ofa.livekit.cloud';
const roomService = new RoomServiceClient(livekitHost, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
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

export async function createRoom(roomName: string) {
    const user = await currentUser();
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let sid = ""
    const opts = {
        name: roomName,
        emptyTimeout: 60,
        maxParticipants: 20,
    };
    roomService.createRoom(opts).then((room: Room) => {
        console.log('room created', room);
        sid = room.sid;
    });

    const outputs = {
        file: new EncodedFileOutput({
            filepath: `recordings/${user.id}/${sid}/${roomName}.mp4`,
            output: {
                case: 's3',
                value: {
                    accessKey: process.env.AWS_S3_ACCESS_KEY,
                    secret: process.env.AWS_S3_SECRET_KEY,
                    bucket: "virevos-recordings",
                    region: "us-east-1",
                    forcePathStyle: true,
                },
            },
        }),
    };
    const egressClient = new EgressClient(livekitHost);
    await egressClient.startRoomCompositeEgress(roomName, outputs, {
        layout: 'grid',
        encodingOptions: EncodingOptionsPreset.H264_1080P_30,
        audioOnly: false,
    });

    const time = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    await db
        .insert(meetings)
        .values({
            id: sid,
            title: roomName,
            date: new Date().toISOString(),
            origin: "app",
            time: time,
            duration: 60,
            type: "In-App",
            status: "active",
            userId: user.id
        })
        .onConflictDoUpdate({
            target: meetings.id,
            set: {
                id: sid,
                title: roomName,
                date: new Date().toISOString(),
                origin: "app",
                time: time,
                duration: 60,
                type: "In-App",
                status: "active",
                userId: user.id
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
