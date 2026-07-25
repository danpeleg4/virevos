import {
  acceptBookingWithCalendar,
  createPortalBooking,
  getPortalBookings,
  updateBookingStatus,
} from "@/lib/portal/portal_bookings";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  canonicalBookingRow,
  canonicalBookingToken,
  makeFakePortalBookingsDb,
} from "../fakes/fake_portal_bookings_db";
import { makeFakeCalendarDb } from "../fakes/fake_calendar_db";
import { makeFakeGraphCalendarService } from "../fakes/fake_graph_calendar_service";
import { makeFakeOutlookDb } from "../fakes/fake_outlook_db";
import { makeFakeGraphAuthService } from "../fakes/fake_graph_auth_service";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => null })),
}));

const mockAddMeetingToCalendar = vi.fn();
vi.mock("@/lib/workspace/calendar", () => ({
  addMeetingToCalendar: (...args: never[]) => mockAddMeetingToCalendar(...args),
}));

const portalBookingsDb = makeFakePortalBookingsDb();
const calendarDb = makeFakeCalendarDb();
const graphCalendar = makeFakeGraphCalendarService();
const outlookDb = makeFakeOutlookDb();
const graphAuthService = makeFakeGraphAuthService();

const acceptBooking = (bookingId: number) =>
  acceptBookingWithCalendar(
    bookingId,
    portalBookingsDb,
    calendarDb,
    graphCalendar,
    outlookDb,
    graphAuthService
  );

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

const mockUser = { id: "user_1" };

// ─── getPortalBookings ───────────────────────────────────────────────────────

describe("getPortalBookings", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getPortalBookings("user_1", portalBookingsDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws Unauthorized when authenticated user does not match requested userId", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "other_user" });
    await expect(getPortalBookings("user_1", portalBookingsDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("returns mapped bookings for authenticated user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    const result = await getPortalBookings("user_1", portalBookingsDb);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: canonicalBookingRow.id,
      clientName: "Jane Client",
      clientEmail: "jane@client.com",
      duration: 30,
      status: "pending",
      clientDisplayName: "Jane Client Co.",
    });
    expect(typeof result[0].dateTime).toBe("string");
  });
});

// ─── updateBookingStatus ─────────────────────────────────────────────────────

describe("updateBookingStatus", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      updateBookingStatus(1, "confirmed", portalBookingsDb)
    ).rejects.toThrow("Unauthorized");
  });

  it("updates the status scoped to the user for 'confirmed'", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await updateBookingStatus(1, "confirmed", portalBookingsDb);

    expect(portalBookingsDb.setBookingStatus).toHaveBeenCalledWith(
      1,
      "user_1",
      "confirmed"
    );
  });

  it("updates the status for 'cancelled'", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await updateBookingStatus(2, "cancelled", portalBookingsDb);

    expect(portalBookingsDb.setBookingStatus).toHaveBeenCalledWith(
      2,
      "user_1",
      "cancelled"
    );
  });
});

// ─── acceptBookingWithCalendar ───────────────────────────────────────────────

describe("acceptBookingWithCalendar", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(acceptBooking(1)).rejects.toThrow("Unauthorized");
  });

  it("throws when the booking is not found", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    portalBookingsDb.getBookingForUser.mockResolvedValueOnce([]);
    await expect(acceptBooking(1)).rejects.toThrow("Booking not found");
  });

  it("marks booking confirmed and persists eventId + meetingLink from the created calendar event", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockAddMeetingToCalendar.mockResolvedValueOnce({
      id: "evt-123",
      link: "https://virevos.com/meet/evt-123",
    });

    await acceptBooking(1);

    expect(portalBookingsDb.setBookingStatus).toHaveBeenCalledWith(
      1,
      "user_1",
      "confirmed"
    );
    expect(portalBookingsDb.setBookingEventInfo).toHaveBeenCalledWith(
      1,
      "evt-123",
      "https://virevos.com/meet/evt-123"
    );
    expect(mockAddMeetingToCalendar).toHaveBeenCalledWith(
      expect.objectContaining({
        title: `Meeting with ${canonicalBookingRow.clientName}`,
        duration: canonicalBookingRow.duration,
        isMeeting: true,
      }),
      calendarDb,
      graphCalendar,
      outlookDb,
      graphAuthService
    );
  });

  it("stores meetingLink as null when the created event has no link", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockAddMeetingToCalendar.mockResolvedValueOnce({
      id: "evt-123",
      link: null,
    });

    await acceptBooking(1);

    expect(portalBookingsDb.setBookingEventInfo).toHaveBeenCalledWith(
      1,
      "evt-123",
      null
    );
  });

  it("still confirms the booking and swallows the error when calendar sync fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockAddMeetingToCalendar.mockRejectedValueOnce(new Error("calendar down"));

    await expect(acceptBooking(1)).resolves.toBeUndefined();

    expect(portalBookingsDb.setBookingStatus).toHaveBeenCalledWith(
      1,
      "user_1",
      "confirmed"
    );
    expect(portalBookingsDb.setBookingEventInfo).not.toHaveBeenCalled();
  });

  it("does not persist eventId when calendar event has no id", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockAddMeetingToCalendar.mockResolvedValueOnce({ id: null, link: null });

    await acceptBooking(1);

    expect(portalBookingsDb.setBookingEventInfo).not.toHaveBeenCalled();
  });
});

// ─── createPortalBooking ─────────────────────────────────────────────────────

describe("createPortalBooking", () => {
  const validInput = {
    clientName: "Alice",
    clientEmail: "alice@example.com",
    dateTime: "2026-06-01T10:00:00.000Z",
    duration: 30,
    notes: "Discuss Q3 roadmap",
  };

  it("throws when clientName is missing", async () => {
    await expect(
      createPortalBooking(
        "test-token",
        { ...validInput, clientName: "" },
        portalBookingsDb
      )
    ).rejects.toThrow(/clientName/);
  });

  it("throws when clientEmail is invalid", async () => {
    await expect(
      createPortalBooking(
        "test-token",
        { ...validInput, clientEmail: "not-an-email" },
        portalBookingsDb
      )
    ).rejects.toThrow(/clientEmail.*valid email/);
  });

  it("throws Portal not found when token is unknown", async () => {
    portalBookingsDb.getPortalByToken.mockResolvedValueOnce([]);
    await expect(
      createPortalBooking("unknown-token", validInput, portalBookingsDb)
    ).rejects.toThrow("Portal not found");
  });

  it("throws Portal not found when portal is disabled", async () => {
    portalBookingsDb.getPortalByToken.mockResolvedValueOnce([
      { ...canonicalBookingToken, enabled: false },
    ]);
    await expect(
      createPortalBooking("test-token", validInput, portalBookingsDb)
    ).rejects.toThrow("Portal not found");
  });

  it("throws Scheduling not enabled when meetingSchedulingEnabled is false", async () => {
    portalBookingsDb.getPortalByToken.mockResolvedValueOnce([
      {
        ...canonicalBookingToken,
        settings: { meetingSchedulingEnabled: false },
      },
    ]);
    await expect(
      createPortalBooking("test-token", validInput, portalBookingsDb)
    ).rejects.toThrow("Scheduling not enabled");
  });

  it("throws Invalid duration when duration is not allowed", async () => {
    portalBookingsDb.getPortalByToken.mockResolvedValueOnce([
      {
        ...canonicalBookingToken,
        settings: {
          meetingSchedulingEnabled: true,
          availability: { meetingDurations: [30, 60] },
        },
      },
    ]);
    await expect(
      createPortalBooking(
        "test-token",
        { ...validInput, duration: 45 },
        portalBookingsDb
      )
    ).rejects.toThrow("Invalid duration");
  });

  it("inserts a pending booking and returns its id", async () => {
    portalBookingsDb.getPortalByToken.mockResolvedValueOnce([
      {
        ...canonicalBookingToken,
        settings: {
          meetingSchedulingEnabled: true,
          availability: { meetingDurations: [30, 60] },
        },
      },
    ]);
    portalBookingsDb.insertBooking.mockResolvedValueOnce({
      ...canonicalBookingRow,
      id: 42,
    });

    const result = await createPortalBooking(
      "test-token",
      validInput,
      portalBookingsDb
    );

    expect(result).toEqual({ success: true, bookingId: 42 });
    expect(portalBookingsDb.insertBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        portalId: canonicalBookingToken.id,
        clientId: canonicalBookingToken.clientId,
        userId: canonicalBookingToken.userId,
        clientName: "Alice",
        clientEmail: "alice@example.com",
        duration: 30,
        status: "pending",
        notes: "Discuss Q3 roadmap",
      })
    );
  });

  it("stores notes as null when omitted", async () => {
    portalBookingsDb.getPortalByToken.mockResolvedValueOnce([
      {
        ...canonicalBookingToken,
        settings: {
          meetingSchedulingEnabled: true,
          availability: { meetingDurations: [30, 60] },
        },
      },
    ]);
    portalBookingsDb.insertBooking.mockResolvedValueOnce({
      ...canonicalBookingRow,
      id: 7,
    });

    const { notes: _notes, ...withoutNotes } = validInput;
    void _notes;
    await createPortalBooking("test-token", withoutNotes, portalBookingsDb);

    expect(portalBookingsDb.insertBooking).toHaveBeenCalledWith(
      expect.objectContaining({ notes: null })
    );
  });
});
