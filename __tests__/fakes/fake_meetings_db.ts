import type { ActionItem, EventRow, MeetingsDB } from "@db/classes/meetings_db";

export const canonicalMeetingRow: EventRow = {
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
  outlookEventId: null,
  recordingSize: null,
  clientId: null,
  userId: "user_1",
  createdAt: new Date(),
};

export type FakeMeetingsDb = {
  [K in keyof MeetingsDB]: Mock<MeetingsDB[K]>;
};

export function makeFakeMeetingsDb(
  overrides: Partial<MeetingsDB> = {}
): FakeMeetingsDb {
  const fake = {
    setEventStatus: vi.fn(async () => {}),
    insertEvent: vi.fn(async () => {}),
    getActionItems: vi.fn(
      async (): Promise<{ actionItems: ActionItem[] | null }[]> => [
        {
          actionItems: [
            {
              task: "Send follow-up",
              owner: "Dan",
              dueDate: null,
              completed: false,
            },
          ],
        },
      ]
    ),
    setActionItems: vi.fn(async () => {}),
    getLatestMeeting: vi.fn(async () => [{ ...canonicalMeetingRow }]),
    getEventIdForUser: vi.fn(async (eventId: string) => [{ id: eventId }]),
    getMeetingStartTime: vi.fn(async (eventId: string) => [
      { id: eventId, meetingStartTimeEpoch: 1_700_000_000 },
    ]),
    getTranscriptChunks: vi.fn(async () => [
      { speaker: "Dan", text: "Hello", createdAt: new Date() },
    ]),
    getEventByIdUnscoped: vi.fn(async (eventId: string) => [
      { ...canonicalMeetingRow, id: eventId },
    ]),
    setRoomStatus: vi.fn(async () => {}),
    getMeetingOwnerWithRecordingStatus: vi.fn(async () => [
      { userId: "user_1", recordingStatus: true },
    ]),
    setMeetingStartEpoch: vi.fn(async () => {}),
    markRoomFinished: vi.fn(async () => {}),
    getTranscriptChunksFull: vi.fn(async () => [
      {
        id: 1,
        meetingId: "evt-1",
        speakerIdentity: "Dan",
        text: "Hello",
        createdAt: new Date(),
      },
    ]),
    getMeetingOwner: vi.fn(async () => [{ userId: "user_1" }]),
    getClientsForUser: vi.fn(async () => [
      { id: 1, name: "Jane Client", email: "jane@client.com" },
    ]),
    updateMeetingAnalysis: vi.fn(async () => {}),
    insertDocumentRequestWithItems: vi.fn(async () => {}),
    incrementAiCredits: vi.fn(async () => {}),
    creditRecordingStorage: vi.fn(async () => {}),
    insertAttendee: vi.fn(async () => {}),
  } satisfies MeetingsDB;

  return Object.assign(fake, overrides) as FakeMeetingsDb;
}
