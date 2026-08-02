import { getCurrentUser } from "@/lib/supabase/auth";
import type { CalendarDB, EventUpdateData } from "@db/classes/calendar_db";
import type { GraphCalendarServiceInterface } from "@/api_client/ms_graph/graph_calendar_service";
import type { OutlookDB } from "@db/classes/outlook_db";
import type { GraphAuthServiceInterface } from "@/api_client/ms_graph/graph_auth_service";
import { Event } from "@/types/meeting";
import { getFreshOutlookAccessToken } from "@/lib/outlook/outlook_access";
import { deriveMeetingStatus } from "@/lib/meeting_status";
import { ValidationError } from "../util/validation";

export async function getEvents(calendarDb: CalendarDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const rows = await calendarDb.getEventsWithAttendees(user.id);

  const now = new Date();
  return rows.map((row) => deriveMeetingStatus(row, now));
}

export async function getEventWithHost(id: string, calendarDb: CalendarDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const [meeting] = await calendarDb.getEventByIdUnscoped(id);
  if (!meeting) return null;

  const isHost = user.id === meeting.userId;

  return { meeting: deriveMeetingStatus(meeting), isHost };
}

export async function addMeetingToCalendar(
  meeting: Event,
  calendarDb: CalendarDB,
  graphCalendar: GraphCalendarServiceInterface,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  const startDate = new Date(meeting.dateTime);
  const meetingId = crypto.randomUUID();

  let outlookEventId: string | null = null;
  const outlookToken = await getFreshOutlookAccessToken(
    user.id,
    outlookDb,
    graphAuthService
  );

  if (outlookToken) {
    const endDate = new Date(startDate.getTime() + meeting.duration * 60000);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      const res = await graphCalendar.createEvent(outlookToken, {
        subject: meeting.title,
        body: { contentType: "Text", content: meeting.description ?? "" },
        start: { dateTime: startDate.toISOString(), timeZone: tz },
        end: { dateTime: endDate.toISOString(), timeZone: tz },
      });
      outlookEventId = res.id;
    } catch (error) {
      console.error("Outlook Calendar error:", error);
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
    userId: user.id,
    outlookEventId,
  };

  return calendarDb.insertEvent(payload);
}

export async function updateEvent(
  input: {
    id?: string;
    eventTitle?: string;
    title?: string;
    description?: string;
    dateTime?: string;
    duration?: number;
    status?: string;
  },
  calendarDb: CalendarDB,
  graphCalendar: GraphCalendarServiceInterface,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const updateData: EventUpdateData = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.dateTime !== undefined)
    updateData.dateTime = new Date(input.dateTime);
  if (input.duration !== undefined) updateData.duration = input.duration;
  if (input.status !== undefined) updateData.status = input.status;

  if (Object.keys(updateData).length === 0) return;

  let targetId = input.id;
  if (!targetId) {
    if (!input.eventTitle) {
      throw new ValidationError("id or eventTitle is required", 400);
    }
    const matches = await calendarDb.getEventByTitle(user.id, input.eventTitle);
    if (matches.length === 0) {
      throw new ValidationError("No event found", 400);
    }
    targetId = matches[0].id;
  }

  await calendarDb.updateEvent(targetId, user.id, updateData);

  const hasExternalFields =
    input.title !== undefined ||
    input.description !== undefined ||
    input.dateTime !== undefined;
  if (hasExternalFields) {
    const [eventRow] = await calendarDb.getEventById(targetId, user.id);

    if (eventRow) {
      const outlookToken = await getFreshOutlookAccessToken(
        user.id,
        outlookDb,
        graphAuthService
      );
      if (outlookToken && eventRow.outlookEventId) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        try {
          await graphCalendar.updateEvent(
            outlookToken,
            eventRow.outlookEventId,
            {
              ...(input.title ? { subject: input.title } : {}),
              ...(input.description
                ? { body: { contentType: "Text", content: input.description } }
                : {}),
              ...(input.dateTime
                ? {
                    start: {
                      dateTime: new Date(input.dateTime).toISOString(),
                      timeZone: tz,
                    },
                  }
                : {}),
            }
          );
        } catch (error) {
          console.error("Outlook Calendar update error:", error);
        }
      }
    }
  }
}

export async function deleteEventFromCalendar(
  id: string,
  calendarDb: CalendarDB,
  graphCalendar: GraphCalendarServiceInterface,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  const meetingRow = await calendarDb.getEventById(id, user.id);

  if (meetingRow.length === 0) {
    return { success: false, error: "Meeting not found" };
  }

  const meeting = meetingRow[0];
  const outlookToken = await getFreshOutlookAccessToken(
    user.id,
    outlookDb,
    graphAuthService
  );
  if (outlookToken && meeting.outlookEventId) {
    try {
      await graphCalendar.deleteEvent(outlookToken, meeting.outlookEventId);
    } catch (error) {
      console.error("Error deleting from Outlook Calendar:", error);
    }
  }

  // Delete from DB
  await calendarDb.deleteEvent(id, user.id);
  return { success: true };
}

export async function updateEventDateTime(
  id: string,
  newDateTime: Date,
  calendarDb: CalendarDB,
  graphCalendar: GraphCalendarServiceInterface,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const [eventRow] = await calendarDb.getEventById(id, user.id);

  if (!eventRow) throw new Error("Event not found");

  await calendarDb.updateEvent(id, user.id, { dateTime: newDateTime });

  const newEnd = new Date(newDateTime.getTime() + eventRow.duration * 60000);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const outlookToken = await getFreshOutlookAccessToken(
    user.id,
    outlookDb,
    graphAuthService
  );
  if (outlookToken && eventRow.outlookEventId) {
    try {
      await graphCalendar.updateEvent(outlookToken, eventRow.outlookEventId, {
        start: { dateTime: newDateTime.toISOString(), timeZone: tz },
        end: { dateTime: newEnd.toISOString(), timeZone: tz },
      });
    } catch (error) {
      console.error("Outlook Calendar reschedule error:", error);
    }
  }

  return { success: true };
}
