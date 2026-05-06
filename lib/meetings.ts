"use server";

import { db } from "@db/db";
import { events } from "@db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import {
  MAX_MESSAGE,
  MAX_SHORT,
  MAX_TITLE,
  ValidationError,
  requireInt,
  requireString,
} from "./validation";
import {
  TRANSCRIPT_BUCKET,
  TRANSCRIPT_INDEX,
  createEmbedding,
  supabaseVector,
} from "./embeddings";

export async function startMeeting(meetingId: string) {
  const user = await currentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  const id = requireString(meetingId, "meetingId", MAX_SHORT);
  await db
    .update(events)
    .set({ status: "active" })
    .where(and(eq(events.id, id), eq(events.userId, user.id)));
}

export async function createInstantMeeting(title: string) {
  const user = await currentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  const validTitle = requireString(title, "title", MAX_TITLE);

  const now = new Date();
  const meetingId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  await db.insert(events).values({
    id: meetingId,
    title: validTitle,
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

export async function markActionItemAdded(eventId: string, itemIndex: number) {
  const user = await currentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  const id = requireString(eventId, "eventId", MAX_SHORT);
  const idx = requireInt(itemIndex, "itemIndex");

  const [event] = await db
    .select({ action_items: events.action_items })
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, user.id)));

  if (!event?.action_items) return;

  const updated = event.action_items.map((item, i) =>
    i === idx ? { ...item, added: true } : item
  );

  await db
    .update(events)
    .set({ action_items: updated })
    .where(and(eq(events.id, id), eq(events.userId, user.id)));
}

export async function getPastMeetingTranscript(text: string) {
  const user = await currentUser();
  if (!user?.id) {
    return ["Unauthorized"];
  }
  const validText = requireString(text, "text", MAX_MESSAGE);

  const queryEmbedding = await createEmbedding(validText);

  const index = supabaseVector.storage.vectors
    .from(TRANSCRIPT_BUCKET)
    .index(TRANSCRIPT_INDEX);

  const { data, error } = await index.queryVectors({
    queryVector: { float32: queryEmbedding },
    topK: 10,
    filter: { user_id: user.id },
    returnMetadata: true,
  });

  if (error) {
    console.error("[getPastMeetingTranscript] queryVectors error:", error);
    return [];
  }

  const arr: string[] = [];
  for (const hit of data?.vectors ?? []) {
    const meta = hit.metadata as { chunk_text?: string } | undefined;
    if (meta?.chunk_text) {
      arr.push(meta.chunk_text);
    }
  }
  return arr;
}
