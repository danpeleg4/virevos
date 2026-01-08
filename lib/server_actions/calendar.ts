"use server"

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { meetings, meetingTypes, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {MeetingType, NewMeetingInput} from "@/types/meeting";
import { getFreshGoogleAccessToken } from '@/lib/google_access'
import { google } from 'googleapis'
import { parseDateTime } from "@/lib/date_utils";
import {NextResponse} from "next/server";

type MeetingUpdate = Partial<typeof meetings.$inferInsert>;

type meetingData = {
    name: string;
    duration: number;
    description: string;
    color: string;
    maxBookings?: number
}

export async function addMeetingToCalendar(meeting: NewMeetingInput) {
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }

    const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.user_id, user.id))
        .limit(1);

    if (dbUser.length === 0) {
        throw new Error("User not found in database");
    }

    const internalUserId = dbUser[0].user_id;
    const startDate = parseDateTime(meeting.date, meeting.time);
    const meetingId = crypto.randomUUID();

    let googleEventId: string | null = null;
    const googleToken = await getFreshGoogleAccessToken(user.id);

    if (googleToken) {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: googleToken });

        const calendar = google.calendar({
            version: "v3",
            auth: oauth2Client,
        });

        try {
            const googleEvent = await calendar.events.insert({
                calendarId: "primary",
                requestBody: {
                    summary: meeting.title,
                    description: meeting.description,
                    start: {
                        dateTime: startDate.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                    end: {
                        dateTime: new Date(
                            startDate.getTime() + meeting.duration * 60000
                        ).toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                    extendedProperties: {
                        private: {
                            appMeetingId: meetingId,
                        },
                    },
                },
            });

            googleEventId = googleEvent.data.id ?? null;
        } catch (error) {
            console.error("Google Calendar error:", error);
        }
    }

    const [inserted] = await db
        .insert(meetings)
        .values({
            id: meetingId,
            title: meeting.title,
            description: meeting.description,
            link: null,
            origin: "app",
            date: meeting.date,
            time: meeting.time,
            duration: meeting.duration,
            type: meeting.type,
            status: meeting.status,
            hasNotes: meeting.hasNotes ?? false,
            hasTranscript: meeting.hasTranscript ?? false,
            autoRescheduled: meeting.autoRescheduled ?? false,
            conflictReason: meeting.conflictReason ?? null,
            userId: internalUserId,
            googleEventId,
        })
        .returning();
    return inserted;
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
    const s = await db.select().from(meetingTypes).where(eq(meetings.userId, user.id));
    if (s.length >= 5) return
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

export async function editMeetingType(editType: MeetingType) {
    const user = await currentUser();
    if (!user?.id) throw new Error("Unauthorized");
    try {
        await db.update(meetingTypes).set({
            name: editType.name,
            description: editType.description,
            active: editType.active,
            duration: editType.duration,
            color: editType.color,
        }).where(and(eq(meetingTypes.userId, user.id),
            eq(meetingTypes.id, editType.id)));
    } catch (err) {
        console.error("Error updating Meeting Type", err);
    }
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
    const dbUpdates: MeetingUpdate = {
        title: updates.title,
        description: updates.description,
        date: updates.date,
        time: updates.time,
        duration: updates.duration,
        type: updates.type,
        status: updates.status,
        hasNotes: updates.hasNotes,
        hasTranscript: updates.hasTranscript,
        autoRescheduled: updates.autoRescheduled,
        conflictReason: updates.conflictReason,
    };

    // Update in DB
    await db.update(meetings)
        .set(dbUpdates)
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