import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { users, meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { google } from "googleapis";
import { getFreshGoogleAccessToken } from "@/lib/google_access";

export async function GET() {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch internal user
    const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.user_id, user.id))
        .limit(1);

    if (dbUser.length === 0) {
        return new NextResponse("User not found", { status: 404 });
    }

    const internalUserId = dbUser[0].user_id;

    // Google token
    const token = await getFreshGoogleAccessToken(user.id);
    if (token) {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: token });
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Today range
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // Fetch Google events
        const list = await calendar.events.list({
            calendarId: "primary",
            timeMin: startOfToday.toISOString(),
            timeMax: endOfToday.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
        });

        const events = list.data.items ?? [];

        // Existing DB meetings for this user
        const existingMeetings = await db
            .select()
            .from(meetings)
            .where(eq(meetings.userId, internalUserId));

        const existingMap = new Map(existingMeetings.map(m => [m.googleEventId || m.id, m]));
        const googleEventIds = new Set(events.map(e => e.id).filter(Boolean) as string[]);

        // 1. Delete meetings from DB if they were removed from Google Calendar
        // (Only for those that originated from Google OR have a googleEventId)
        for (const m of existingMeetings) {
            const googleId = m.googleEventId || m.id;
            // We only sync deletions for events that were either imported from Google or synced to Google
            if ((m.origin === "google_calendar" || m.googleEventId) && !googleEventIds.has(googleId)) {
                // Check if the meeting date is today (since we only listed today's events)
                const startOfTodayStr = startOfToday.toISOString().slice(0, 10);
                if (m.date === startOfTodayStr) {
                    await db.delete(meetings).where(eq(meetings.id, m.id));
                    existingMap.delete(googleId);
                }
            }
        }

        const meetingsToInsert = [];
        for (const e of events) {
            if (!e.id || !e.start) continue;

            // Skip events created by the app itself that haven't been processed yet
            // (They should have appId in extendedProperties)
            if (e.extendedProperties?.private?.appId) {
                // If it exists in DB, we might want to update googleEventId if not set
                const appId = e.extendedProperties.private.appId;
                const dbMeeting = existingMeetings.find(m => m.id === appId);
                if (dbMeeting && !dbMeeting.googleEventId) {
                    await db.update(meetings).set({ googleEventId: e.id }).where(eq(meetings.id, appId));
                }
                continue;
            }

            let start: Date;
            if (e.start?.dateTime) {
                start = new Date(e.start.dateTime);
            } else if (e.start?.date) {
                start = new Date(e.start.date);
            } else {
                continue;
            }

            let end: Date;
            if (e.end?.dateTime) {
                end = new Date(e.end.dateTime);
            } else if (e.end?.date) {
                end = new Date(e.end.date);
            } else {
                end = start;
            }

            const durationMinutes = Math.max(
                1,
                Math.round((end.getTime() - start.getTime()) / 60000)
            );

            const title = e.summary ?? "Untitled";
            const description = e.description ?? null;
            const link = e.hangoutLink ?? e.htmlLink ?? null;
            const dateStr = start.toISOString().slice(0, 10);
            const timeStr = start.toTimeString().slice(0, 5);
            const status = e.status ?? "confirmed";

            if (existingMap.has(e.id)) {
                // 2. Update existing meeting if changed
                const m = existingMap.get(e.id)!;
                const hasChanged = 
                    m.title !== title || 
                    m.description !== description || 
                    m.link !== link || 
                    m.date !== dateStr || 
                    m.time !== timeStr || 
                    m.duration !== durationMinutes ||
                    m.status !== status;

                if (hasChanged) {
                    await db.update(meetings)
                        .set({
                            title,
                            description,
                            link,
                            date: dateStr,
                            time: timeStr,
                            duration: durationMinutes,
                            status
                        })
                        .where(eq(meetings.id, m.id));
                }
                continue;
            }

            // 3. Insert new meeting
            meetingsToInsert.push({
                id: e.id,
                googleEventId: e.id,
                title,
                description,
                link,
                date: dateStr,
                time: timeStr,
                duration: durationMinutes,
                origin: "google_calendar",
                type: "in-person",
                status,
                userId: internalUserId,
            });
        }

        if (meetingsToInsert.length > 0) {
            await db.insert(meetings).values(meetingsToInsert);
        }
    }

    // Return DB meetings
    const rows = await db.query.meetings.findMany({
        where: eq(meetings.userId, internalUserId),
        with: {
            attendees: true,
        },
    });

    return NextResponse.json(rows);
}
