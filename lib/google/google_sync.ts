import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import { db } from "@db/db";
import { events, googleSyncState } from "@db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getFreshGoogleAccessToken } from "@/lib/google/google_access";

export async function getCalendarClient(userId: string) {
  const token = await getFreshGoogleAccessToken(userId);
  if (!token) throw new Error(`No Google token for user ${userId}`);
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

async function applyGoogleEventsToDb(
  googleItems: calendar_v3.Schema$Event[],
  userId: string,
  timeMin?: Date,
  timeMax?: Date
): Promise<void> {
  const existingEvents = await db
    .select()
    .from(events)
    .where(eq(events.userId, userId));

  const existingMap = new Map(
    existingEvents.map((m) => [m.googleEventId || m.id, m])
  );

  type EventUpdate = {
    id: string;
    set: {
      title: string;
      description: string | null;
      link: string | null;
      dateTime: Date;
      duration: number;
      status: string;
      isMeeting: boolean;
    };
  };
  type EventInsert = {
    id: string;
    googleEventId: string;
    title: string;
    description: string | null;
    link: string | null;
    dateTime: Date;
    duration: number;
    origin: string;
    isMeeting: boolean;
    status: string;
    userId: string;
  };

  const idsToDelete = new Set<string>();
  const cancelledGoogleIdsToDelete = new Set<string>();
  const linkUpdates: { appMeetingId: string; googleEventId: string }[] = [];
  const eventUpdates: EventUpdate[] = [];
  const meetingsToInsert: EventInsert[] = [];

  if (timeMin && timeMax) {
    const googleEventIds = new Set(
      googleItems.map((e) => e.id).filter(Boolean) as string[]
    );
    for (const m of existingEvents) {
      const googleId = m.googleEventId || m.id;
      if (
        (m.origin === "google_calendar" || m.googleEventId) &&
        !googleEventIds.has(googleId)
      ) {
        const mDate = new Date(m.dateTime);
        if (mDate >= timeMin && mDate <= timeMax) {
          idsToDelete.add(m.id);
          existingMap.delete(googleId);
        }
      }
    }
  }

  for (const e of googleItems) {
    if (!e.id) continue;

    if (e.status === "cancelled") {
      const existing = existingMap.get(e.id);
      if (existing) {
        idsToDelete.add(existing.id);
      } else {
        cancelledGoogleIdsToDelete.add(e.id);
      }
      continue;
    }

    if (!e.start) continue;

    if (e.extendedProperties?.private?.appMeetingId) {
      const appMeetingId = e.extendedProperties.private.appMeetingId;
      const dbMeeting = existingEvents.find((m) => m.id === appMeetingId);
      if (dbMeeting && !dbMeeting.googleEventId) {
        linkUpdates.push({ appMeetingId, googleEventId: e.id });
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
    const dateTime = start;
    const status = e.status ?? "confirmed";
    const isMeeting =
      !!e.hangoutLink ||
      !!e.conferenceData?.entryPoints?.some(
        (ep) => ep.entryPointType === "video"
      );

    const existing = existingMap.get(e.id);
    if (existing) {
      const hasChanged =
        existing.title !== title ||
        existing.description !== description ||
        existing.link !== link ||
        existing.dateTime.getTime() !== dateTime.getTime() ||
        existing.duration !== durationMinutes ||
        existing.status !== status ||
        existing.isMeeting !== isMeeting;

      if (hasChanged) {
        eventUpdates.push({
          id: existing.id,
          set: {
            title,
            description,
            link,
            dateTime,
            duration: durationMinutes,
            status,
            isMeeting,
          },
        });
      }
      continue;
    }

    meetingsToInsert.push({
      id: e.id,
      googleEventId: e.id,
      title,
      description,
      link,
      dateTime,
      duration: durationMinutes,
      origin: "google_calendar",
      isMeeting,
      status,
      userId,
    });
  }

  if (
    idsToDelete.size === 0 &&
    cancelledGoogleIdsToDelete.size === 0 &&
    linkUpdates.length === 0 &&
    eventUpdates.length === 0 &&
    meetingsToInsert.length === 0
  ) {
    return;
  }

  await db.transaction(async (tx) => {
    if (idsToDelete.size > 0) {
      await tx
        .delete(events)
        .where(
          and(
            eq(events.userId, userId),
            inArray(events.id, Array.from(idsToDelete))
          )
        );
    }

    if (cancelledGoogleIdsToDelete.size > 0) {
      await tx
        .delete(events)
        .where(
          and(
            eq(events.userId, userId),
            inArray(
              events.googleEventId,
              Array.from(cancelledGoogleIdsToDelete)
            )
          )
        );
    }

    for (const u of linkUpdates) {
      await tx
        .update(events)
        .set({ googleEventId: u.googleEventId })
        .where(eq(events.id, u.appMeetingId));
    }

    for (const u of eventUpdates) {
      await tx.update(events).set(u.set).where(eq(events.id, u.id));
    }

    if (meetingsToInsert.length > 0) {
      await tx.insert(events).values(meetingsToInsert);
    }
  });
}

export async function performFullSync(userId: string): Promise<void> {
  const calendar = await getCalendarClient(userId);

  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 30);

  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 6);

  let pageToken: string | undefined;
  let syncToken: string | undefined;
  const allItems: calendar_v3.Schema$Event[] = [];

  // Do NOT use timeMin/timeMax here: Google won't return nextSyncToken when
  // time range filters are present. We filter to our display window locally.
  do {
    const res = await calendar.events.list({
      calendarId: "primary",
      singleEvents: true,
      pageToken,
    });

    allItems.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
    if (!pageToken) {
      syncToken = res.data.nextSyncToken ?? undefined;
    }
  } while (pageToken);

  // Filter to the display window before applying to DB
  const windowItems = allItems.filter((e) => {
    if (!e.start) return false;
    const start = e.start.dateTime
      ? new Date(e.start.dateTime)
      : e.start.date
        ? new Date(e.start.date)
        : null;
    return start !== null && start >= timeMin && start <= timeMax;
  });

  await applyGoogleEventsToDb(windowItems, userId, timeMin, timeMax);

  await db
    .insert(googleSyncState)
    .values({
      userId,
      channelId: "",
      resourceId: "",
      syncToken: syncToken ?? null,
    })
    .onConflictDoUpdate({
      target: googleSyncState.userId,
      set: { syncToken: syncToken ?? null },
    });
}

export async function performIncrementalSync(userId: string): Promise<void> {
  const rows = await db
    .select()
    .from(googleSyncState)
    .where(eq(googleSyncState.userId, userId))
    .limit(1);

  const syncToken = rows[0]?.syncToken;

  if (!syncToken) {
    await performFullSync(userId);
    return;
  }

  const calendar = await getCalendarClient(userId);

  try {
    let pageToken: string | undefined;
    let newSyncToken: string | undefined;
    const allItems: calendar_v3.Schema$Event[] = [];

    do {
      const res = await calendar.events.list({
        calendarId: "primary",
        syncToken: pageToken ? undefined : syncToken,
        pageToken,
        singleEvents: true,
      });

      allItems.push(...(res.data.items ?? []));
      pageToken = res.data.nextPageToken ?? undefined;
      if (!pageToken) {
        newSyncToken = res.data.nextSyncToken ?? undefined;
      }
    } while (pageToken);

    await applyGoogleEventsToDb(allItems, userId);

    await db
      .update(googleSyncState)
      .set({ syncToken: newSyncToken ?? null })
      .where(eq(googleSyncState.userId, userId));
  } catch (err: unknown) {
    const status =
      (err as { code?: number }).code ?? (err as { status?: number }).status;
    if (status === 410) {
      console.log(
        `[google_sync] syncToken expired for ${userId}, falling back to full sync`
      );
      await performFullSync(userId);
    } else {
      throw err;
    }
  }
}

export async function setupWatchChannel(userId: string): Promise<void> {
  const calendar = await getCalendarClient(userId);
  const channelId = crypto.randomUUID();
  const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const env =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_APP_URL
      : process.env.NEXT_PUBLIC_APP_URL_NGROK;

  const webhookUrl = `${env}/api/webhooks/google`;

  const res = await calendar.events.watch({
    calendarId: "primary",
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: webhookUrl,
      token: userId,
      expiration: String(expiration),
    },
  });

  const resourceId = res.data.resourceId!;
  const actualExpiration = Number(res.data.expiration) || expiration;

  await db
    .insert(googleSyncState)
    .values({
      userId,
      channelId,
      resourceId,
      channelExpiration: actualExpiration,
      syncToken: null,
    })
    .onConflictDoUpdate({
      target: googleSyncState.userId,
      set: {
        channelId,
        resourceId,
        channelExpiration: actualExpiration,
      },
    });
}

export async function stopWatchChannel(userId: string): Promise<void> {
  const rows = await db
    .select()
    .from(googleSyncState)
    .where(eq(googleSyncState.userId, userId))
    .limit(1);

  if (!rows.length) return;

  const { channelId, resourceId } = rows[0];

  if (channelId && resourceId) {
    try {
      const calendar = await getCalendarClient(userId);
      await calendar.channels.stop({
        requestBody: { id: channelId, resourceId },
      });
    } catch (err) {
      console.error(
        `[google_sync] Failed to stop watch channel for ${userId}:`,
        err
      );
    }
  }

  await db.delete(googleSyncState).where(eq(googleSyncState.userId, userId));
}
