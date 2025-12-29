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

    // Get Google access token
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

        // Fetch today's events
        const list = await calendar.events.list({
            calendarId: "primary",
            timeMin: startOfToday.toISOString(),
            timeMax: endOfToday.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
        });

        const todayEvents = list.data.items ?? [];

        // Existing meetings
        const existing = await db
            .select({ id: meetings.id })
            .from(meetings)
            .where(eq(meetings.userId, internalUserId));

        const existingIds = new Set(existing.map(m => m.id));

        // Map new Google events -> DB rows
        const newMeetings = todayEvents
            .filter(e => e.id && e.start && !existingIds.has(e.id))
            .map(e => {
                const start = e.start?.dateTime
                    ? new Date(e.start.dateTime)
                    : new Date(e.start!.date!);

                const end = e.end?.dateTime
                    ? new Date(e.end.dateTime)
                    : new Date(e.end!.date!);

                const durationMinutes = Math.max(
                    1,
                    Math.round((end.getTime() - start.getTime()) / 60000)
                );

                return {
                    id: e.id!, // Google event ID
                    title: e.summary ?? "Untitled",
                    description: e.description ?? null,
                    link: e.hangoutLink ?? e.htmlLink ?? null,

                    date: start.toISOString().slice(0, 10), // YYYY-MM-DD
                    time: start.toTimeString().slice(0, 5), // HH:mm
                    duration: durationMinutes,

                    type: "google",
                    status: e.status ?? "confirmed",

                    userId: internalUserId,
                };
            });

        if (newMeetings.length > 0) {
            await db.insert(meetings).values(newMeetings);
        }
    }

    // Return meetings from DB
    const rows = await db.query.meetings.findMany({
        where: eq(meetings.userId, internalUserId),
        with: {
            attendees: true,
        },
    });

    return NextResponse.json(rows);
}
