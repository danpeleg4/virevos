import type {
  CalendarDB,
  EventRow,
  EventWithAttendeesRow,
  NewEventRow,
} from "@db/classes/calendar_db";

export const canonicalEventRow: EventRow = {
  id: "evt-1",
  title: "Team Sync",
  description: "Weekly sync",
  link: null,
  dateTime: new Date("2026-08-01T10:00:00Z"),
  duration: 30,
  isMeeting: true,
  meetingStartTimeEpoch: null,
  status: "upcoming",
  tags: [],
  hasNotes: false,
  hasTranscript: false,
  aiSummary: null,
  key_points: null,
  actionItems: null,
  autoRescheduled: false,
  conflictReason: null,
  origin: "app",
  outlookEventId: "outlook-evt-1",
  recordingSize: null,
  clientId: null,
  userId: "user_1",
  createdAt: new Date(),
};

export type FakeCalendarDb = {
  [K in keyof CalendarDB]: Mock<CalendarDB[K]>;
};

export function makeFakeCalendarDb(
  overrides: Partial<CalendarDB> = {}
): FakeCalendarDb {
  const fake = {
    getEventsWithAttendees: vi.fn(
      async (): Promise<EventWithAttendeesRow[]> => [
        { ...canonicalEventRow, attendees: [] },
      ]
    ),
    getEventByIdUnscoped: vi.fn(async (eventId: string) => [
      { ...canonicalEventRow, id: eventId },
    ]),
    getEventById: vi.fn(async (eventId: string) => [
      { ...canonicalEventRow, id: eventId },
    ]),
    getEventByTitle: vi.fn(async (_userId: string, title: string) => [
      { ...canonicalEventRow, title },
    ]),
    insertEvent: vi.fn(async (values: NewEventRow): Promise<EventRow> => ({
      ...canonicalEventRow,
      ...values,
      description: values.description ?? null,
      link: values.link ?? null,
      status: values.status ?? "upcoming",
    })),
    updateEvent: vi.fn(async () => {}),
    deleteEvent: vi.fn(async () => {}),
    getEventsForUser: vi.fn(async (): Promise<EventRow[]> => [
      { ...canonicalEventRow },
    ]),
    insertEvents: vi.fn(async () => {}),
    deleteEventByOutlookEventId: vi.fn(async () => {}),
  } satisfies CalendarDB;

  return Object.assign(fake, overrides) as FakeCalendarDb;
}
