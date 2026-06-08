import {
  addMeetingToCalendar,
  deleteEventFromCalendar,
  updateEvent,
  updateEventDateTime,
} from "@/lib/workspace/calendar";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import type { Event } from "@/types/meeting";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockGetFreshOutlookAccessToken = vi.fn();
vi.mock("@/lib/outlook/outlook_access", () => ({
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
  mockGetFreshOutlookAccessToken.mockResolvedValue(null);
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
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(addMeetingToCalendar(mockMeeting)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when user not found in DB", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([]); // no user in DB
    await expect(addMeetingToCalendar(mockMeeting)).rejects.toThrow(
      "User not found in database"
    );
  });

  it("inserts event to DB when isMeeting is true (activation handled by cron)", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
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
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
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
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(deleteEventFromCalendar("event-1")).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("returns { success: false, error: 'Meeting not found' } when event does not exist in DB", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([]); // event not found
    const result = await deleteEventFromCalendar("event-1");
    expect(result).toEqual({ success: false, error: "Meeting not found" });
  });
});

// ─── updateEvent ──────────────────────────────────────────────────────────

describe("updateEvent", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateEvent({ id: "event-1", title: "X" })).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("does nothing when no fields provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateEvent({ id: "event-1" });
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it("updates provided fields with correct where clause", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateEvent({ id: "event-1", title: "New Title", duration: 90 });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New Title", duration: 90 })
    );
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it("converts dateTime string to a Date when updating", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateEvent({ id: "event-1", dateTime: "2026-06-01T10:00:00Z" });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ dateTime: new Date("2026-06-01T10:00:00Z") })
    );
  });
});

// ─── updateEventDateTime ──────────────────────────────────────────────────

describe("updateEventDateTime", () => {
  const newDateTime = new Date("2026-06-01T15:00:00Z");

  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateEventDateTime("event-1", newDateTime)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when the event does not exist", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([]);
    await expect(updateEventDateTime("event-1", newDateTime)).rejects.toThrow(
      "Event not found"
    );
  });

  it("updates the local DB row with the new dateTime", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 60,
        outlookEventId: null,
      },
    ]);

    await updateEventDateTime("event-1", newDateTime);

    expect(mockUpdateSet).toHaveBeenCalledWith({ dateTime: newDateTime });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it("patches Outlook with start AND end (preserving duration) when token + outlookEventId exist", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 30,
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
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 60,
        outlookEventId: "outlook-id",
      },
    ]);

    await updateEventDateTime("event-1", newDateTime);

    expect(mockAxiosPatch).not.toHaveBeenCalled();
  });

  it("skips Outlook patch when row has no outlookEventId", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 60,
        outlookEventId: null,
      },
    ]);
    mockGetFreshOutlookAccessToken.mockResolvedValueOnce("outlook-token");

    await updateEventDateTime("event-1", newDateTime);

    expect(mockAxiosPatch).not.toHaveBeenCalled();
  });

  it("still returns success and persists the local DB change when Outlook patch fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "event-1",
        duration: 60,
        outlookEventId: "outlook-id",
      },
    ]);
    mockGetFreshOutlookAccessToken.mockResolvedValueOnce("outlook-token");
    mockAxiosPatch.mockRejectedValueOnce(new Error("Outlook 500"));

    const result = await updateEventDateTime("event-1", newDateTime);

    expect(mockUpdateSet).toHaveBeenCalledWith({ dateTime: newDateTime });
    expect(result).toEqual({ success: true });
  });
});
