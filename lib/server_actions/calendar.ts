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


type meetingData = {
    name: string;
    duration: number;
    description: string;
    color: string;
    platform: "zoom" | "google-meet" | "In-Person";
    maxBookings?: number
}

export async function addMeetingToCalendar(meeting: NewMeetingInput) {
    const body: NewMeetingInput = meeting
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }

    const googleToken = await getFreshGoogleAccessToken(user.id);

    // Lookup internal DB user
    const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.user_id, user.id))
        .limit(1);

    const startDate = parseDateTime(body.date, body.time);
    if (dbUser.length === 0) {
        return
    }

    let googleEventId: string | null = null;
    const internalUserId = dbUser[0].user_id;
    const email = dbUser[0].email;
        if (googleToken) {
            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials({access_token: googleToken});
            const calendar = google.calendar({version: "v3", auth: oauth2Client});

            try {
                const googleEvent = await calendar.events.insert({
                    calendarId: "primary",
                    requestBody: {
                        summary: body.title,
                        description: body.description,
                        start: {
                            dateTime: startDate.toISOString(),
                        },
                        end: {
                            dateTime: new Date(startDate.getTime() + body.duration * 60000).toISOString(),
                        },
                        extendedProperties: {
                            private: {
                                appId: meeting.id,
                            },
                        },
                    },
                });
                googleEventId = googleEvent.data.id || null;
            } catch (error) {
                console.error("Google Calendar error:", error);
            }
        }

    // Insert meeting
    const inserted = await db
        .insert(meetings)
        .values({
            id: Math.random().toString(36).substring(7),
            title: body.title,
            description: body.description,
            link: null,
            origin: "app",
            date: body.date,
            time: body.time,
            duration: body.duration,
            type: body.type,
            status: body.status,
            hasNotes: body.hasNotes ?? false,
            hasTranscript: body.hasTranscript ?? false,
            autoRescheduled: body.autoRescheduled ?? false,
            conflictReason: body.conflictReason ?? null,
            userId: internalUserId,
            googleEventId: googleEventId
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
    const googleToken = await getFreshGoogleAccessToken(user.id);
    if (googleToken) {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: googleToken });
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        try {
            await calendar.events.delete({
                calendarId: "primary",
                eventId: meeting.googleEventId || meeting.id,
            });
        } catch (error) {
            console.error("Error deleting from Google Calendar:", error);
            // We might want to continue even if Google delete fails (e.g. event already deleted manually)
        }
    }


    // Delete from DB
    await db.delete(meetings).where(and(eq(meetings.id, id), eq(meetings.userId, user.id)));
    return { success: true };
}

export async function createMeetsType(data: meetingData) {
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }
    const all = {...data, userId: user.id}
    await db.insert(meetingTypes).values(all)
}

export async function updateActiveMeetingType(id: number, active: boolean) {
    const user = await currentUser();
    if (!user?.id) throw new Error("Unauthorized");

    const result = await db
        .update(meetingTypes)
        .set({ active })
        .where(
            and(
                eq(meetingTypes.id, id),
                eq(meetingTypes.userId, user.id)
            )
        )
        .returning();

    return result;
}

export async function deleteMeetsType(id: number){
    const user = await currentUser();
    if (!user?.id) throw new Error("Unauthorized");
    await db.delete(meetingTypes).where(and(eq(meetingTypes.id, id), eq(meetingTypes.userId, user.id)));
}

export async function updateMeetingInCalendar(id: string, updates: Partial<NewMeetingInput>) {
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }

    const meetingRow = await db
        .select()
        .from(meetings)
        .where(and(eq(meetings.id, id), eq(meetings.userId, user.id)))
        .limit(1);

    if (meetingRow.length === 0) {
        throw new Error("Meeting not found");
    }

    const meeting = meetingRow[0];

    // Update in DB
    await db.update(meetings)
        .set(updates)
        .where(eq(meetings.id, id));

    // Sync to Google Calendar if connected
    const googleToken = await getFreshGoogleAccessToken(user.id);
    const googleId = meeting.googleEventId || (meeting.origin === "google_calendar" ? meeting.id : null);

    if (googleToken && googleId) {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: googleToken });
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const startDate = updates.date && updates.time 
            ? parseDateTime(updates.date, updates.time)
            : parseDateTime(meeting.date, meeting.time);
        
        const duration = updates.duration ?? meeting.duration;

        try {
            await calendar.events.patch({
                calendarId: "primary",
                eventId: googleId,
                requestBody: {
                    summary: updates.title ?? meeting.title,
                    description: (updates.description ?? meeting.description) + (meeting.link ? `\n\nMeeting Link: ${meeting.link}` : ""),
                    start: {
                        dateTime: startDate.toISOString(),
                    },
                    end: {
                        dateTime: new Date(startDate.getTime() + duration * 60000).toISOString(),
                    },
                },
            });
        } catch (error) {
            console.error("Error updating Google Calendar:", error);
        }
    }

    return { success: true };
}