"use server";

import { Pinecone } from "@pinecone-database/pinecone";
import { db } from "@db/db";
import { events } from "@db/schema";
import { currentUser } from "@clerk/nextjs/server";
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function createInstantMeeting(title: string) {
  const user = await currentUser();
  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  const now = new Date();
  const meetingId = crypto.randomUUID().slice(0, 5);
  await db.insert(events).values({
    id: meetingId,
    title,
    link: `https://virevos.com/meet/${meetingId}`,
    dateTime: now,
    origin: "app",
    duration: 60,
    isMeeting: true,
    status: "active",
    userId: user.id,
  });
  return { id: meetingId, link: `https://virevos.com/meet/${meetingId}` };
}

export async function getPastMeetingTranscript(text: string) {
  const user = await currentUser();
  if (!user?.id) {
    return ["Unauthorized"]
  }
  const indexName = "vire-recording";
  const index = pc.index(indexName).namespace(user.id);
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
