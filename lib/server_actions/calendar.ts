"use server"

import {currentUser} from "@clerk/nextjs/server";
import {NextResponse} from "next/server";
import {db} from "@/db/db";
import {meetings, users, zoomTokens} from "@/db/schema";
import {eq} from "drizzle-orm";
import type { NewMeetingInput } from "@/types/meeting";
import { getFreshZoomAccessToken } from '@/lib/zoom_access'

export async function addMeetingToCalendar(meeting: NewMeetingInput) {
    const body: NewMeetingInput = meeting
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }

    // Lookup internal DB user
    const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.user_id, user.id))
        .limit(1);

    if (dbUser.length === 0) {
        return
    }

    const internalUserId = dbUser[0].user_id;

    const email = dbUser[0].email;
    const tokenRow = await db
        .select()
        .from(zoomTokens)
        .where(eq(zoomTokens.userId, user.id))
        .limit(1);

    if (tokenRow.length === 0) {
        return
    }

    const accessToken = await getFreshZoomAccessToken(user.id);
    const zoomRes = await fetch(
        `https://api.zoom.us/v2/users/${email}/meetings`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                topic: body.title,
                agenda: body.description ? body.description : "",
                type: 2,
                start_time: body.date + "T" + body.time + ":00Z",
                duration: body.duration,
                settings: {
                    host_video: true,
                    auto_recording: "cloud",
                    participant_video: false,
                },
            }),
        }
    );

    const zoomData = await zoomRes.json();

    if (!zoomRes.ok) {
        console.error("Zoom error:", zoomData);
        return
    }

    // Insert meeting
    const inserted = await db
        .insert(meetings)
        .values({
            id: zoomData.id,
            title: body.title,
            description: body.description,
            link: zoomData.join_url,
            date: body.date,
            time: body.time,
            duration: body.duration,
            type: body.type,
            status: body.status,
            hasNotes: body.hasNotes ?? false,
            hasTranscript: body.hasTranscript ?? false,
            autoRescheduled: body.autoRescheduled ?? false,
            conflictReason: body.conflictReason ?? null,
            userId: internalUserId
        })
        .returning();
    return inserted[0];
}