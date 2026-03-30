"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { events, users } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { Event } from "@/types/meeting";
import { getFreshGoogleAccessToken } from "@/lib/google_access";
import { google } from "googleapis";

export async function addMeetingToCalendar(meeting: Event) {
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
  const startDate = new Date(meeting.dateTime);
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

  const now = new Date();
  const status = startDate > now ? "upcoming" : "scheduled";
  const payload = {
    id: meetingId,
    title: meeting.title,
    description: meeting.description,
    link: meeting.isMeeting ? `https://virevos.com/meet/${meetingId}` : null,
    origin: "app",
    dateTime: startDate,
    duration: meeting.duration,
    isMeeting: meeting.isMeeting,
    status: status,
    hasNotes: meeting.hasNotes ?? false,
    hasTranscript: meeting.hasTranscript ?? false,
    autoRescheduled: meeting.autoRescheduled ?? false,
    conflictReason: meeting.conflictReason ?? null,
    userId: internalUserId,
    googleEventId,
  };

  const [inserted] = await db
    .insert(events)
    .values({
      ...payload,
    })
    .returning();
  return inserted;
}

export async function updateEvent(input: {
  id: string;
  title?: string;
  description?: string;
  dateTime?: string;
  duration?: number;
  status?: string;
}) {
  const user = await currentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.dateTime !== undefined) updateData.dateTime = new Date(input.dateTime);
  if (input.duration !== undefined) updateData.duration = input.duration;
  if (input.status !== undefined) updateData.status = input.status;

  if (Object.keys(updateData).length === 0) return;

  await db
    .update(events)
    .set(updateData)
    .where(and(eq(events.id, input.id), eq(events.userId, user.id)));

  if (input.dateTime !== undefined) {
    const googleToken = await getFreshGoogleAccessToken(user.id);
    if (googleToken) {
      const eventRow = await db
        .select()
        .from(events)
        .where(and(eq(events.id, input.id), eq(events.userId, user.id)))
        .limit(1);

      if (eventRow.length > 0) {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: googleToken });
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });
        const googleEventId = eventRow[0].googleEventId || input.id;

        try {
          await calendar.events.patch({
            calendarId: "primary",
            eventId: googleEventId,
            requestBody: {
              ...(input.title ? { summary: input.title } : {}),
              ...(input.description ? { description: input.description } : {}),
              ...(input.dateTime
                ? {
                    start: {
                      dateTime: new Date(input.dateTime).toISOString(),
                      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                  }
                : {}),
            },
          });
        } catch (error) {
          console.error("Google Calendar update error:", error);
        }
      }
    }
  }
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
  await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.userId, user.id)));
  return { success: true };
}

export async function updateEventDateTime(id: string, newDateTime: Date) {
  const user = await currentUser();
  if (!user?.id) throw new Error("Unauthorized");

  await db
    .update(events)
    .set({ dateTime: newDateTime })
    .where(and(eq(events.id, id), eq(events.userId, user.id)));

  return { success: true };
}
