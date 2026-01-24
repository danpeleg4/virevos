"use server"

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { events, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NewMeetingInput } from "@/types/meeting";
import { getFreshGoogleAccessToken } from '@/lib/google_access'
import { google } from 'googleapis'
import { parseDateTime } from "@/lib/date_utils";
import {createRoom} from "@/lib/server_actions/meetings";

type MeetingUpdate = Partial<typeof events.$inferInsert>;

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

    if (meeting.isMeeting){
        await createRoom(meeting.title);
    }

    // Determine meeting status
    const now = new Date();
    const status = startDate > now ? "upcoming" : "scheduled";
    const [inserted] = await db
        .insert(events)
        .values({
            id: meetingId,
            title: meeting.title,
            description: meeting.description,
            link: meeting.isMeeting ? `https://virevos.com/meet/${crypto.randomUUID()}` : null,
            origin: "app",
            date: meeting.date,
            time: meeting.time,
            duration: meeting.duration,
            isMeeting: meeting.isMeeting,
            status: status,
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
        .from(events)
        .where(and(eq(events.id, id), eq(events.userId, user.id)))
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
    await db.delete(events).where(and(eq(events.id, id), eq(events.userId, user.id)));
    return { success: true };
}

export async function updateMeetingInCalendar(id: string, updates: Partial<NewMeetingInput>) {
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }

    const meetingRow = await db
        .select()
        .from(events)
        .where(and(eq(events.id, id), eq(events.userId, user.id)))
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
        isMeeting: false,
        status: updates.status,
        hasNotes: updates.hasNotes,
        hasTranscript: updates.hasTranscript,
        autoRescheduled: updates.autoRescheduled,
        conflictReason: updates.conflictReason,
    };

    // Update in DB
    await db.update(events)
        .set(dbUpdates)
        .where(eq(events.id, id));

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