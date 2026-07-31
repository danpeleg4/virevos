import {
  addMeetingToCalendar,
  deleteEventFromCalendar,
  getEvents,
  getEventWithHost,
  updateEvent,
  updateEventDateTime,
} from "@/lib/workspace/calendar";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getFreshOutlookAccessToken } from "@/lib/outlook/outlook_access";
import type { Event } from "@/types/meeting";
import {
  canonicalEventRow,
  makeFakeCalendarDb,
} from "../fakes/fake_calendar_db";
import { makeFakeGraphCalendarService } from "../fakes/fake_graph_calendar_service";
import { makeFakeOutlookDb } from "../fakes/fake_outlook_db";
import { makeFakeGraphAuthService } from "../fakes/fake_graph_auth_service";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/outlook/outlook_access", () => ({
  getFreshOutlookAccessToken: vi.fn(),
}));

const calendarDb = makeFakeCalendarDb();
const graphCalendar = makeFakeGraphCalendarService();
const outlookDb = makeFakeOutlookDb();
const graphAuthService = makeFakeGraphAuthService();

const mockUser = { id: "user_1" };

const baseMeeting: Event = {
  id: "",
  title: "Client Call",
  description: "Kickoff",
  dateTime: new Date("2099-06-01T10:00:00Z"),
  duration: 30,
  isMeeting: true,
} as Event;

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue(mockUser);
  (getFreshOutlookAccessToken as Mock).mockResolvedValue("token-123");
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── getEvents ────────────────────────────────────────────────────────────

describe("getEvents", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getEvents(calendarDb)).rejects.toThrow("Unauthorized");
  });

  it("returns the user's events with derived status", async () => {
    const rows = await getEvents(calendarDb);

    expect(calendarDb.getEventsWithAttendees).toHaveBeenCalledWith("user_1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({ id: "evt-1" }));
    expect(rows[0].status).toBeTruthy();
  });
});

// ─── getEventWithHost ─────────────────────────────────────────────────────

describe("getEventWithHost", () => {
  it("returns null when the event does not exist", async () => {
    calendarDb.getEventByIdUnscoped.mockResolvedValueOnce([]);
    await expect(getEventWithHost("ghost", calendarDb)).resolves.toBeNull();
  });

  it("marks the owner as host", async () => {
    const result = await getEventWithHost("evt-1", calendarDb);
    expect(result?.isHost).toBe(true);
  });

  it("marks other users as non-host", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_2" });
    const result = await getEventWithHost("evt-1", calendarDb);
    expect(result?.isHost).toBe(false);
  });
});

// ─── addMeetingToCalendar ─────────────────────────────────────────────────

describe("addMeetingToCalendar", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      addMeetingToCalendar(
        baseMeeting,
        calendarDb,
        graphCalendar,
        outlookDb,
        graphAuthService
      )
    ).rejects.toThrow("Unauthorized");
  });

  it("creates the Outlook event and stores its id", async () => {
    await addMeetingToCalendar(
      baseMeeting,
      calendarDb,
      graphCalendar,
      outlookDb,
      graphAuthService
    );

    expect(graphCalendar.createEvent).toHaveBeenCalledWith(
      "token-123",
      expect.objectContaining({
        subject: "Client Call",
        body: { contentType: "Text", content: "Kickoff" },
      })
    );
    expect(calendarDb.insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Client Call",
        outlookEventId: "outlook-evt-new",
        userId: "user_1",
        status: "upcoming",
      })
    );
  });

  it("skips Outlook when the user has no token", async () => {
    (getFreshOutlookAccessToken as Mock).mockResolvedValue(null);

    await addMeetingToCalendar(
      baseMeeting,
      calendarDb,
      graphCalendar,
      outlookDb,
      graphAuthService
    );

    expect(graphCalendar.createEvent).not.toHaveBeenCalled();
    expect(calendarDb.insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({ outlookEventId: null })
    );
  });

  it("still inserts the event when the Outlook call fails", async () => {
    graphCalendar.createEvent.mockRejectedValueOnce(new Error("graph down"));

    await addMeetingToCalendar(
      baseMeeting,
      calendarDb,
      graphCalendar,
      outlookDb,
      graphAuthService
    );

    expect(calendarDb.insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({ outlookEventId: null })
    );
  });

  it("builds a meet link for meetings", async () => {
    await addMeetingToCalendar(
      baseMeeting,
      calendarDb,
      graphCalendar,
      outlookDb,
      graphAuthService
    );

    const values = calendarDb.insertEvent.mock.calls[0][0];
    expect(values.link).toMatch(/^https:\/\/virevos\.com\/meet\//);
  });
});

// ─── updateEvent ──────────────────────────────────────────────────────────

describe("updateEvent", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      updateEvent(
        { id: "evt-1", title: "X" },
        calendarDb,
        graphCalendar,
        outlookDb,
        graphAuthService
      )
    ).rejects.toThrow("Unauthorized");
  });

  it("does nothing when no fields provided", async () => {
    await updateEvent(
      { id: "evt-1" },
      calendarDb,
      graphCalendar,
      outlookDb,
      graphAuthService
    );
    expect(calendarDb.updateEvent).not.toHaveBeenCalled();
  });

  it("throws when neither id nor eventTitle is provided", async () => {
    await expect(
      updateEvent(
        { status: "completed" },
        calendarDb,
        graphCalendar,
        outlookDb,
        graphAuthService
      )
    ).rejects.toThrow("id or eventTitle is required");
    expect(calendarDb.updateEvent).not.toHaveBeenCalled();
  });

  it("throws Validation error when no event found via getEventByTitle", async () => {
    calendarDb.getEventByTitle.mockResolvedValueOnce([]);
    await expect(
      updateEvent(
        { eventTitle: "Nobody's Meeting", status: "completed" },
        calendarDb,
        graphCalendar,
        outlookDb,
        graphAuthService
      )
    ).rejects.toThrow("No event found");
    expect(calendarDb.updateEvent).not.toHaveBeenCalled();
  });

  it("looks up the event by eventTitle when id is not provided", async () => {
    calendarDb.getEventByTitle.mockResolvedValueOnce([
      { ...canonicalEventRow, id: "evt-9" },
    ]);
    await updateEvent(
      { eventTitle: "Team Sync", status: "completed" },
      calendarDb,
      graphCalendar,
      outlookDb,
      graphAuthService
    );
    expect(calendarDb.getEventByTitle).toHaveBeenCalledWith(
      "user_1",
      "Team Sync"
    );
    expect(calendarDb.updateEvent).toHaveBeenCalledWith("evt-9", "user_1", {
      status: "completed",
    });
  });

  it("updates the row and mirrors external fields to Outlook", async () => {
    await updateEvent(
      { id: "evt-1", title: "Renamed" },
      calendarDb,
      graphCalendar,
      outlookDb,
      graphAuthService
    );

    expect(calendarDb.updateEvent).toHaveBeenCalledWith("evt-1", "user_1", {
      title: "Renamed",
    });
    expect(graphCalendar.updateEvent).toHaveBeenCalledWith(
      "token-123",
      "outlook-evt-1",
      expect.objectContaining({ subject: "Renamed" })
    );
  });

  it("skips the Outlook mirror for status-only updates", async () => {
    await updateEvent(
      { id: "evt-1", status: "completed" },
      calendarDb,
      graphCalendar,
      outlookDb,
      graphAuthService
    );

    expect(calendarDb.updateEvent).toHaveBeenCalled();
    expect(graphCalendar.updateEvent).not.toHaveBeenCalled();
  });

  it("survives an Outlook mirror failure", async () => {
    graphCalendar.updateEvent.mockRejectedValueOnce(new Error("graph down"));

    await expect(
      updateEvent(
        { id: "evt-1", title: "Renamed" },
        calendarDb,
        graphCalendar,
        outlookDb,
        graphAuthService
      )
    ).resolves.toBeUndefined();
  });
});

// ─── deleteEventFromCalendar ──────────────────────────────────────────────

describe("deleteEventFromCalendar", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      deleteEventFromCalendar(
        "evt-1",
        calendarDb,
        graphCalendar,
        outlookDb,
        graphAuthService
      )
    ).rejects.toThrow("Unauthorized");
  });

  it("reports failure when the meeting is missing", async () => {
    calendarDb.getEventById.mockResolvedValueOnce([]);

    await expect(
      deleteEventFromCalendar(
        "ghost",
        calendarDb,
        graphCalendar,
        outlookDb,
        graphAuthService
      )
    ).resolves.toEqual({ success: false, error: "Meeting not found" });
    expect(calendarDb.deleteEvent).not.toHaveBeenCalled();
  });

  it("deletes from Outlook and the DB", async () => {
    await expect(
      deleteEventFromCalendar(
        "evt-1",
        calendarDb,
        graphCalendar,
        outlookDb,
        graphAuthService
      )
    ).resolves.toEqual({ success: true });

    expect(graphCalendar.deleteEvent).toHaveBeenCalledWith(
      "token-123",
      "outlook-evt-1"
    );
    expect(calendarDb.deleteEvent).toHaveBeenCalledWith("evt-1", "user_1");
  });

  it("still deletes locally when the Outlook delete fails", async () => {
    graphCalendar.deleteEvent.mockRejectedValueOnce(new Error("graph down"));

    await expect(
      deleteEventFromCalendar(
        "evt-1",
        calendarDb,
        graphCalendar,
        outlookDb,
        graphAuthService
      )
    ).resolves.toEqual({ success: true });
    expect(calendarDb.deleteEvent).toHaveBeenCalled();
  });
});

// ─── updateEventDateTime ──────────────────────────────────────────────────

describe("updateEventDateTime", () => {
  const newDate = new Date("2099-07-01T09:00:00Z");

  it("throws when the event does not exist", async () => {
    calendarDb.getEventById.mockResolvedValueOnce([]);

    await expect(
      updateEventDateTime(
        "ghost",
        newDate,
        calendarDb,
        graphCalendar,
        outlookDb,
        graphAuthService
      )
    ).rejects.toThrow("Event not found");
  });

  it("updates the row and reschedules the Outlook event", async () => {
    await expect(
      updateEventDateTime(
        "evt-1",
        newDate,
        calendarDb,
        graphCalendar,
        outlookDb,
        graphAuthService
      )
    ).resolves.toEqual({ success: true });

    expect(calendarDb.updateEvent).toHaveBeenCalledWith("evt-1", "user_1", {
      dateTime: newDate,
    });
    const [, , patch] = graphCalendar.updateEvent.mock.calls[0];
    expect(patch.start?.dateTime).toBe(newDate.toISOString());
    // the end time lands duration minutes later
    expect(patch.end?.dateTime).toBe(
      new Date(
        newDate.getTime() + canonicalEventRow.duration * 60000
      ).toISOString()
    );
  });

  it("succeeds even when the Outlook reschedule fails", async () => {
    graphCalendar.updateEvent.mockRejectedValueOnce(new Error("graph down"));

    await expect(
      updateEventDateTime(
        "evt-1",
        newDate,
        calendarDb,
        graphCalendar,
        outlookDb,
        graphAuthService
      )
    ).resolves.toEqual({ success: true });
  });
});
