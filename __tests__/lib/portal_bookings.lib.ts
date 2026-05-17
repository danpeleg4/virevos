import {
  acceptBookingWithCalendar,
  getPortalBookings,
  updateBookingStatus,
} from "@/lib/portal_bookings";
import { getCurrentUser } from "@/lib/supabase/auth";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockWhere = vi.fn();
const mockSet = vi.fn(() => ({ where: mockWhere }));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(() => ({ set: mockSet })),
  },
}));

const mockAddMeetingToCalendar = vi.fn();
vi.mock("@/lib/workspace/calendar", () => ({
  addMeetingToCalendar: (...args: never[]) =>
    // eslint-disable-next-line prefer-spread
    mockAddMeetingToCalendar.apply(null, args),
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
