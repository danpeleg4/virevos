import {
  addMeetingToCalendar,
  deleteEventFromCalendar,
  updateEvent,
  updateEventDateTime,
} from "@/lib/calendar";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import type { Event } from "@/types/meeting";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

/* eslint-disable no-var */
var mockEventsInsert: Mock;
var mockEventsDelete: Mock;
var mockSetCredentials: Mock;
var mockCalendar: Mock;
var mockEventsPatch: Mock;
/* eslint-enable no-var */

vi.mock("googleapis", () => {
  mockEventsInsert = vi.fn();
  mockEventsDelete = vi.fn();
  mockEventsPatch = vi.fn();
  mockSetCredentials = vi.fn();
  mockCalendar = vi.fn(() => ({
    events: {
      insert: mockEventsInsert,
      delete: mockEventsDelete,
      patch: mockEventsPatch,
    },
  }));
  return {
    google: {
      auth: {
        OAuth2: vi.fn(function () {
          return { setCredentials: mockSetCredentials };
        }),
      },
      // eslint-disable-next-line prefer-spread
      calendar: (...args: never[]) => mockCalendar.apply(null, args),
    },
  };
});

const mockGetFreshGoogleAccessToken = vi.fn();
vi.mock("@/lib/google_access", () => ({
  getFreshGoogleAccessToken: (...args: never[]) =>
    // eslint-disable-next-line prefer-spread
    mockGetFreshGoogleAccessToken.apply(null, args),
}));

const mockGetFreshOutlookAccessToken = vi.fn();
vi.mock("@/lib/outlook_access", () => ({
  getFreshOutlookAccessToken: (...args: never[]) =>
    // eslint-disable-next-line prefer-spread
    mockGetFreshOutlookAccessToken.apply(null, args),
  getOutlookAuthUrl: vi.fn(),
}));

const mockAxiosPatch = vi.fn();
const mockAxiosPost = vi.fn();
const mockAxiosDelete = vi.fn();
vi.mock("axios", () => ({
  __esModule: true,
  default: {
    patch: (...args: never[]) =>
      // eslint-disable-next-line prefer-spread
      mockAxiosPatch.apply(null, args),
    post: (...args: never[]) =>
      // eslint-disable-next-line prefer-spread
      mockAxiosPost.apply(null, args),
    delete: (...args: never[]) =>
      // eslint-disable-next-line prefer-spread
      mockAxiosDelete.apply(null, args),
  },
}));

const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit }));
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));
const mockDeleteWhere = vi.fn();
const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));

vi.mock("@db/db", () => ({
  db: {
    // eslint-disable-next-line prefer-spread
    select: (...args: never[]) => mockSelect.apply(null, args),
    insert: vi.fn(() => ({ values: mockValues })),
    delete: vi.fn(() => ({ where: mockDeleteWhere })),
    update: vi.fn(() => ({ set: mockUpdateSet })),
  },
}));

const mockUser = { id: "user_1" };

const mockMeeting: Event = {
  id: "",
  title: "Test Meeting",
  description: "Test desc",
  dateTime: new Date("2026-06-01T10:00:00Z"),
  duration: 60,
  isMeeting: false,
  status: "upcoming",
  hasNotes: false,
  hasTranscript: false,
  autoRescheduled: false,
  conflictReason: null,
  googleEventId: null,
};

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockSelectLimit.mockResolvedValue([]);
  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });
  mockDeleteWhere.mockResolvedValue(undefined);
  mockValues.mockReturnValue({ returning: mockReturning });
  mockReturning.mockResolvedValue([]);
  mockGetFreshGoogleAccessToken.mockResolvedValue(null);
  mockGetFreshOutlookAccessToken.mockResolvedValue(null);
  mockEventsInsert.mockResolvedValue({ data: { id: "google-event-id" } });
  mockEventsDelete.mockResolvedValue({});
  mockUpdateWhere.mockResolvedValue(undefined);
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockAxiosPatch.mockResolvedValue({ data: {} });
  mockAxiosPost.mockResolvedValue({ data: {} });
  mockAxiosDelete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── addMeetingToCalendar ─────────────────────────────────────────────────

describe("addMeetingToCalendar", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    await expect(addMeetingToCalendar(mockMeeting)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when user not found in DB", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([]); // no user in DB
    await expect(addMeetingToCalendar(mockMeeting)).rejects.toThrow(
      "User not found in database"
    );
  });

  it("inserts event and returns it when there is no Google token (skips Google Calendar)", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([{ user_id: "user_1" }]);
    const inserted = { id: "meet-id", title: "Test Meeting" };
    mockReturning.mockResolvedValueOnce([inserted]);

    const result = await addMeetingToCalendar(mockMeeting);

    expect(mockEventsInsert).not.toHaveBeenCalled();
    expect(result).toEqual(inserted);
  });

  it("creates a Google Calendar event when a token is available and stores the returned googleEventId", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([{ user_id: "user_1" }]);
    mockGetFreshGoogleAccessToken.mockResolvedValueOnce("google-token");
    mockEventsInsert.mockResolvedValueOnce({ data: { id: "gcal-event-id" } });
    const inserted = { id: "meet-id", googleEventId: "gcal-event-id" };
    mockReturning.mockResolvedValueOnce([inserted]);

    const result = await addMeetingToCalendar(mockMeeting);

    expect(mockEventsInsert).toHaveBeenCalledTimes(1);
    expect(result).toEqual(inserted);
  });

  it("inserts event to DB when isMeeting is true (activation handled by cron)", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([{ user_id: "user_1" }]);
    const inserted = { id: "meet-id", isMeeting: true };
    mockReturning.mockResolvedValueOnce([inserted]);

    const result = await addMeetingToCalendar({
      ...mockMeeting,
      isMeeting: true,
    });

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(result).toEqual(inserted);
  });

  it("inserts event without any scheduling when isMeeting is false", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([{ user_id: "user_1" }]);
    const inserted = { id: "meet-id" };
    mockReturning.mockResolvedValueOnce([inserted]);

    const result = await addMeetingToCalendar({
      ...mockMeeting,
      isMeeting: false,
    });

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(result).toEqual(inserted);
  });
});

// ─── deleteEventFromCalendar ──────────────────────────────────────────────

describe("deleteEventFromCalendar", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    await expect(deleteEventFromCalendar("event-1")).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("returns { success: false, error: 'Meeting not found' } when event does not exist in DB", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([]); // event not found
    const result = await deleteEventFromCalendar("event-1");
    expect(result).toEqual({ success: false, error: "Meeting not found" });
  });

  it("deletes from Google Calendar when a token is available", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      { id: "event-1", googleEventId: "gcal-id" },
    ]);
    mockGetFreshGoogleAccessToken.mockResolvedValueOnce("google-token");

    await deleteEventFromCalendar("event-1");

    expect(mockEventsDelete).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: "primary" })
    );
  });

  it("continues and deletes from DB even if Google Calendar delete throws", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      { id: "event-1", googleEventId: null },
    ]);
    mockGetFreshGoogleAccessToken.mockResolvedValueOnce("google-token");
    mockEventsDelete.mockRejectedValueOnce(new Error("Google error"));

    const result = await deleteEventFromCalendar("event-1");

    expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });

  it("returns { success: true } after deleting from DB", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      { id: "event-1", googleEventId: null },
    ]);

    const result = await deleteEventFromCalendar("event-1");

    expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });
});

// ─── updateEvent ──────────────────────────────────────────────────────────

describe("updateEvent", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    await expect(updateEvent({ id: "event-1", title: "X" })).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("does nothing when no fields provided", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    await updateEvent({ id: "event-1" });
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it("updates provided fields with correct where clause", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    await updateEvent({ id: "event-1", title: "New Title", duration: 90 });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New Title", duration: 90 })
    );
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it("converts dateTime string to a Date when updating", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    await updateEvent({ id: "event-1", dateTime: "2026-06-01T10:00:00Z" });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ dateTime: new Date("2026-06-01T10:00:00Z") })
    );
  });

  it("patches Google Calendar when token is available and dateTime is updated", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockGetFreshGoogleAccessToken.mockResolvedValueOnce("google-token");
    mockSelectLimit.mockResolvedValueOnce([
      { id: "event-1", googleEventId: "gcal-id" },
    ]);
    mockEventsPatch.mockResolvedValueOnce({});

    await updateEvent({ id: "event-1", dateTime: "2026-06-01T10:00:00Z" });

    expect(mockEventsPatch).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: "primary", eventId: "gcal-id" })
    );
  });

  it("does not call Google Calendar patch when dateTime is not updated", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockGetFreshGoogleAccessToken.mockResolvedValueOnce("google-token");

    await updateEvent({ id: "event-1", title: "New Title" });

    expect(mockEventsPatch).not.toHaveBeenCalled();
  });
});

// ─── updateEventDateTime ──────────────────────────────────────────────────

describe("updateEventDateTime", () => {
  const newDateTime = new Date("2026-06-01T15:00:00Z");

  it("throws when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    await expect(updateEventDateTime("event-1", newDateTime)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when the event does not exist", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([]);
    await expect(updateEventDateTime("event-1", newDateTime)).rejects.toThrow(
      "Event not found"
    );
  });

  it("updates the local DB row with the new dateTime", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 60,
        googleEventId: null,
        outlookEventId: null,
      },
    ]);

    await updateEventDateTime("event-1", newDateTime);

    expect(mockUpdateSet).toHaveBeenCalledWith({ dateTime: newDateTime });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it("patches Google with start AND end (preserving duration) when token + googleEventId exist", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 45,
        googleEventId: "gcal-id",
        outlookEventId: null,
      },
    ]);
    mockGetFreshGoogleAccessToken.mockResolvedValueOnce("google-token");

    await updateEventDateTime("event-1", newDateTime);

    const expectedEnd = new Date(newDateTime.getTime() + 45 * 60_000);
    expect(mockEventsPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "primary",
        eventId: "gcal-id",
        requestBody: expect.objectContaining({
          start: expect.objectContaining({
            dateTime: newDateTime.toISOString(),
          }),
          end: expect.objectContaining({
            dateTime: expectedEnd.toISOString(),
          }),
        }),
      })
    );
  });

  it("skips Google patch when no Google token", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 60,
        googleEventId: "gcal-id",
        outlookEventId: null,
      },
    ]);

    await updateEventDateTime("event-1", newDateTime);

    expect(mockEventsPatch).not.toHaveBeenCalled();
  });

  it("skips Google patch when there is no googleEventId on the row", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 60,
        googleEventId: null,
        outlookEventId: null,
      },
    ]);
    mockGetFreshGoogleAccessToken.mockResolvedValueOnce("google-token");

    await updateEventDateTime("event-1", newDateTime);

    expect(mockEventsPatch).not.toHaveBeenCalled();
  });

  it("patches Outlook with start AND end (preserving duration) when token + outlookEventId exist", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 30,
        googleEventId: null,
        outlookEventId: "outlook-id",
      },
    ]);
    mockGetFreshOutlookAccessToken.mockResolvedValueOnce("outlook-token");

    await updateEventDateTime("event-1", newDateTime);

    const expectedEnd = new Date(newDateTime.getTime() + 30 * 60_000);
    expect(mockAxiosPatch).toHaveBeenCalledWith(
      expect.stringContaining("/me/events/outlook-id"),
      expect.objectContaining({
        start: expect.objectContaining({
          dateTime: newDateTime.toISOString(),
        }),
        end: expect.objectContaining({
          dateTime: expectedEnd.toISOString(),
        }),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer outlook-token",
        }),
      })
    );
  });

  it("skips Outlook patch when no Outlook token", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 60,
        googleEventId: null,
        outlookEventId: "outlook-id",
      },
    ]);

    await updateEventDateTime("event-1", newDateTime);

    expect(mockAxiosPatch).not.toHaveBeenCalled();
  });

  it("skips Outlook patch when row has no outlookEventId", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 60,
        googleEventId: null,
        outlookEventId: null,
      },
    ]);
    mockGetFreshOutlookAccessToken.mockResolvedValueOnce("outlook-token");

    await updateEventDateTime("event-1", newDateTime);

    expect(mockAxiosPatch).not.toHaveBeenCalled();
  });

  it("still returns success and persists the local DB change when Outlook patch fails", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 60,
        googleEventId: null,
        outlookEventId: "outlook-id",
      },
    ]);
    mockGetFreshOutlookAccessToken.mockResolvedValueOnce("outlook-token");
    mockAxiosPatch.mockRejectedValueOnce(new Error("Outlook 500"));

    const result = await updateEventDateTime("event-1", newDateTime);

    expect(mockUpdateSet).toHaveBeenCalledWith({ dateTime: newDateTime });
    expect(result).toEqual({ success: true });
  });

  it("still returns success when Google patch fails", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 60,
        googleEventId: "gcal-id",
        outlookEventId: null,
      },
    ]);
    mockGetFreshGoogleAccessToken.mockResolvedValueOnce("google-token");
    mockEventsPatch.mockRejectedValueOnce(new Error("Google 500"));

    const result = await updateEventDateTime("event-1", newDateTime);

    expect(result).toEqual({ success: true });
  });
});
