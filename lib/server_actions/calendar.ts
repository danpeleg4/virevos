"use server"

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import {meetings, meetingTypes, users, zoomTokens} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { NewMeetingInput } from "@/types/meeting";
import { getFreshZoomAccessToken } from '@/lib/zoom_access'
import { getFreshGoogleAccessToken } from '@/lib/google_access'
import { google } from 'googleapis'
import { parseDateTime } from "@/lib/date_utils";

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

    // ZOOM INTEGRATION
    const tokenRow = await db
        .select()
        .from(zoomTokens)
        .where(eq(zoomTokens.userId, user.id))
        .limit(1);

    let zoomData = null;
    let googleEventId = null;
    const startDate = parseDateTime(body.date, body.time);

    if (tokenRow.length > 0) {
        const accessToken = await getFreshZoomAccessToken(user.id);
        if (accessToken) {
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
                        start_time: startDate.toISOString(),
                        duration: body.duration,
                        settings: {
                            host_video: true,
                            auto_recording: "cloud",
                            participant_video: false,
                        },
                    }),
                }
            );

            zoomData = await zoomRes.json();

            if (!zoomRes.ok) {
                console.error("Zoom error:", zoomData);
                zoomData = null;
            }
        }
    }

    // GOOGLE CALENDAR INTEGRATION
    const googleToken = await getFreshGoogleAccessToken(user.id);
    if (googleToken) {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: googleToken });
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        try {
            const googleRes = await calendar.events.insert({
                calendarId: "primary",
                requestBody: {
                    summary: body.title,
                    description: body.description + (zoomData ? `\n\nZoom Link: ${zoomData.join_url}` : ""),
                    start: {
                        dateTime: startDate.toISOString(),
                    },
                    end: {
                        dateTime: new Date(startDate.getTime() + body.duration * 60000).toISOString(),
                    },
                    location: zoomData ? zoomData.join_url : "",
                },
            });
            googleEventId = googleRes.data.id;
        } catch (error) {
            console.error("Google Calendar error:", error);
        }
    }

    // Insert meeting
    const inserted = await db
        .insert(meetings)
        .values({
            id: zoomData ? zoomData.id.toString() : Math.random().toString(36).substring(7),
            title: body.title,
            description: body.description,
            link: zoomData ? zoomData.join_url : null,
            date: body.date,
            time: body.time,
            duration: body.duration,
            type: body.type,
            status: body.status,
            hasNotes: body.hasNotes ?? false,
            hasTranscript: body.hasTranscript ?? false,
            autoRescheduled: body.autoRescheduled ?? false,
            conflictReason: body.conflictReason ?? null,
            googleEventId: googleEventId,
            userId: internalUserId
        })
        .returning();
    return inserted[0];
}

export async function deleteEventFromCalendar(id: string) {
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }

    // Get meeting from DB to check for googleEventId
    const meetingRow = await db
        .select()
        .from(meetings)
        .where(and(eq(meetings.id, id), eq(meetings.userId, user.id)))
        .limit(1);

    if (meetingRow.length === 0) {
        return { success: false, error: "Meeting not found" };
    }

    const meeting = meetingRow[0];

    // If it has googleEventId, try to delete from Google Calendar
    if (meeting.googleEventId) {
        const googleToken = await getFreshGoogleAccessToken(user.id);
        if (googleToken) {
            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: googleToken });
            const calendar = google.calendar({ version: "v3", auth: oauth2Client });

            try {
                await calendar.events.delete({
                    calendarId: "primary",
                    eventId: meeting.googleEventId,
                });
            } catch (error) {
                console.error("Error deleting from Google Calendar:", error);
                // We might want to continue even if Google delete fails (e.g. event already deleted manually)
            }
        }
    }

    // Delete from DB
    await db.delete(meetings).where(and(eq(meetings.id, id), eq(meetings.userId, user.id)));
    return { success: true };
}

export async function createMeetsType(data: {
    name: string;
    duration: number;
    description: string;
    color: string;
    platform: "zoom" | "google-meet" | "In-Person";
    maxBookings?: number }) {
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }
    const all = {...data, userId: user.id}
    await db.insert(meetingTypes).values(all)
}

export async function updateActiveMeetingType(id: string, active: boolean) {
    const user = await currentUser();
    if (!user?.id) throw new Error("Unauthorized");

    const result = await db
        .update(meetingTypes)
        .set({ active })
        .where(and(
            eq(meetingTypes.id, id),
            eq(meetingTypes.userId, user.id)
        ));

    return result;
}