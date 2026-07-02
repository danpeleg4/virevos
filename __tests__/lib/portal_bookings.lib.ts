import {
  acceptBookingWithCalendar,
  createPortalBooking,
  getPortalBookings,
  updateBookingStatus,
} from "@/lib/portal_bookings";
import { getCurrentUser } from "@/lib/supabase/auth";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => null })),
}));

const mockWhere = vi.fn();
const mockSet = vi.fn(() => ({ where: mockWhere }));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(() => ({ set: mockSet })),
  },
}));

const mockAddMeetingToCalendar = vi.fn();
vi.mock("@/lib/workspace/calendar", () => ({
  addMeetingToCalendar: (...args: never[]) => mockAddMeetingToCalendar(...args),
}));

import { db } from "@db/db";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockWhere.mockResolvedValue(undefined);
  mockSet.mockReturnValue({ where: mockWhere });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

const mockUser = { id: "user_1" };

const mockBookingRow = {
  id: 1,
  portalId: 10,
  clientId: 5,
  userId: "user_1",
  clientName: "Alice",
  clientEmail: "alice@example.com",
  dateTime: new Date("2026-06-01T10:00:00.000Z"),
  duration: 30,
  status: "pending",
  notes: null,
  meetingLink: null,
  eventId: null,
  createdAt: new Date("2026-05-01T08:00:00.000Z"),
};

// ─── getPortalBookings ───────────────────────────────────────────────────────

describe("getPortalBookings", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getPortalBookings("user_1")).rejects.toThrow("Unauthorized");
  });

  it("throws Unauthorized when authenticated user does not match requested userId", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "other_user" });
    await expect(getPortalBookings("user_1")).rejects.toThrow("Unauthorized");
  });

  it("returns mapped bookings for authenticated user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    const mockFromWhere = vi.fn().mockResolvedValue([mockBookingRow]);
    const mockFrom = vi.fn(() => ({ where: mockFromWhere }));
    (db.select as Mock).mockReturnValue({ from: mockFrom });

    const result = await getPortalBookings("user_1");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      clientName: "Alice",
      clientEmail: "alice@example.com",
      duration: 30,
      status: "pending",
      dateTime: "2026-06-01T10:00:00.000Z",
    });
    expect(typeof result[0].dateTime).toBe("string");
  });
});

// ─── updateBookingStatus ─────────────────────────────────────────────────────

describe("updateBookingStatus", () => {
  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateBookingStatus(1, "confirmed")).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("calls db.update with correct status and ownership condition for 'confirmed'", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await updateBookingStatus(1, "confirmed");

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({ status: "confirmed" });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });

  it("calls db.update with correct status for 'cancelled'", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await updateBookingStatus(2, "cancelled");

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({ status: "cancelled" });
  });
});

// ─── acceptBookingWithCalendar ───────────────────────────────────────────────

describe("acceptBookingWithCalendar", () => {
  function mockSelectReturning(rows: unknown[]) {
    const limit = vi.fn().mockResolvedValue(rows);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    (db.select as Mock).mockReturnValue({ from });
  }

  it("throws Unauthorized when no user is authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(acceptBookingWithCalendar(1)).rejects.toThrow("Unauthorized");
  });

  it("throws when the booking is not found", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectReturning([]);
    await expect(acceptBookingWithCalendar(1)).rejects.toThrow(
      "Booking not found"
    );
  });

  it("marks booking confirmed and persists eventId + meetingLink from the created calendar event", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectReturning([mockBookingRow]);
    mockAddMeetingToCalendar.mockResolvedValueOnce({
      id: "evt-123",
      link: "https://virevos.com/meet/evt-123",
    });

    await acceptBookingWithCalendar(1);

    expect(mockSet).toHaveBeenNthCalledWith(1, { status: "confirmed" });
    expect(mockSet).toHaveBeenNthCalledWith(2, {
      eventId: "evt-123",
      meetingLink: "https://virevos.com/meet/evt-123",
    });
    expect(mockAddMeetingToCalendar).toHaveBeenCalledWith(
      expect.objectContaining({
        title: `Meeting with ${mockBookingRow.clientName}`,
        duration: mockBookingRow.duration,
        isMeeting: true,
      })
    );
  });

  it("stores meetingLink as null when the created event has no link", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectReturning([mockBookingRow]);
    mockAddMeetingToCalendar.mockResolvedValueOnce({
      id: "evt-123",
      link: null,
    });

    await acceptBookingWithCalendar(1);

    expect(mockSet).toHaveBeenNthCalledWith(2, {
      eventId: "evt-123",
      meetingLink: null,
    });
  });

  it("still confirms the booking and swallows the error when calendar sync fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectReturning([mockBookingRow]);
    mockAddMeetingToCalendar.mockRejectedValueOnce(new Error("calendar down"));

    await expect(acceptBookingWithCalendar(1)).resolves.toBeUndefined();

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({ status: "confirmed" });
  });

  it("does not persist eventId when calendar event has no id", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectReturning([mockBookingRow]);
    mockAddMeetingToCalendar.mockResolvedValueOnce({ id: null, link: null });

    await acceptBookingWithCalendar(1);

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({ status: "confirmed" });
  });
});

// ─── createPortalBooking ─────────────────────────────────────────────────────

describe("createPortalBooking", () => {
  const mockPortal = {
    id: 1,
    clientId: 10,
    userId: "user_1",
    token: "test-token",
    enabled: true,
    settings: {
      meetingSchedulingEnabled: true,
      availability: {
        meetingDurations: [30, 60],
        bufferMinutes: 15,
      },
    },
  };

  const validInput = {
    clientName: "Alice",
    clientEmail: "alice@example.com",
    dateTime: "2026-06-01T10:00:00.000Z",
    duration: 30,
    notes: "Discuss Q3 roadmap",
  };

  function mockTokenLookup(rows: unknown[]) {
    const limit = vi.fn().mockResolvedValue(rows);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    (db.select as Mock).mockReturnValue({ from });
  }

  it("throws when clientName is missing", async () => {
    await expect(
      createPortalBooking("test-token", { ...validInput, clientName: "" })
    ).rejects.toThrow(/clientName/);
  });

  it("throws when clientEmail is invalid", async () => {
    await expect(
      createPortalBooking("test-token", {
        ...validInput,
        clientEmail: "not-an-email",
      })
    ).rejects.toThrow(/clientEmail.*valid email/);
  });

  it("throws Portal not found when token is unknown", async () => {
    mockTokenLookup([]);
    await expect(
      createPortalBooking("unknown-token", validInput)
    ).rejects.toThrow("Portal not found");
  });

  it("throws Portal not found when portal is disabled", async () => {
    mockTokenLookup([{ ...mockPortal, enabled: false }]);
    await expect(createPortalBooking("test-token", validInput)).rejects.toThrow(
      "Portal not found"
    );
  });

  it("throws Scheduling not enabled when meetingSchedulingEnabled is false", async () => {
    mockTokenLookup([
      {
        ...mockPortal,
        settings: { ...mockPortal.settings, meetingSchedulingEnabled: false },
      },
    ]);
    await expect(createPortalBooking("test-token", validInput)).rejects.toThrow(
      "Scheduling not enabled"
    );
  });

  it("throws Invalid duration when duration is not allowed", async () => {
    mockTokenLookup([mockPortal]);
    await expect(
      createPortalBooking("test-token", { ...validInput, duration: 45 })
    ).rejects.toThrow("Invalid duration");
  });

  it("inserts a pending booking and returns its id", async () => {
    mockTokenLookup([mockPortal]);

    const returning = vi.fn().mockResolvedValue([{ id: 42 }]);
    const values = vi.fn(() => ({ returning }));
    (db.insert as Mock).mockReturnValue({ values });

    const result = await createPortalBooking("test-token", validInput);

    expect(result).toEqual({ success: true, bookingId: 42 });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        portalId: mockPortal.id,
        clientId: mockPortal.clientId,
        userId: mockPortal.userId,
        clientName: "Alice",
        clientEmail: "alice@example.com",
        duration: 30,
        status: "pending",
        notes: "Discuss Q3 roadmap",
      })
    );
  });

  it("stores notes as null when omitted", async () => {
    mockTokenLookup([mockPortal]);

    const returning = vi.fn().mockResolvedValue([{ id: 7 }]);
    const values = vi.fn(() => ({ returning }));
    (db.insert as Mock).mockReturnValue({ values });

    const { notes: _notes, ...withoutNotes } = validInput;
    void _notes;
    await createPortalBooking("test-token", withoutNotes);

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ notes: null })
    );
  });
});
