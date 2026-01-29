"use server"

import { Pinecone } from '@pinecone-database/pinecone'
import { db } from "@/db/db";
import { events } from "@/db/schema";
import { currentUser } from "@clerk/nextjs/server";
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function createInstantMeeting(title: string) {
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }

    const now = new Date();
    const meetingId = crypto.randomUUID();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    await db
        .insert(events)
        .values({
            id: meetingId,
            title,
            link: `https://virevos.com/meet/${meetingId}`,
            dateTime: now,
            origin: "app",
            duration: 60,
            isMeeting: true,
            status: "active",
            userId: user.id
        })
        .onConflictDoUpdate({
            target: events.id,
            set: {
                id: meetingId,
                title,
                link: `https://virevos.com/meet/${meetingId}`,
                dateTime: now,
                origin: "app",
                duration: 60,
                isMeeting: true,
                status: "active",
                userId: user.id
            },
        });
    return { id: meetingId, link: `https://virevos.com/meet/${meetingId}` };
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
