import { getPortalBookings, updateBookingStatus } from "@/lib/portal_bookings";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

const mockWhere = jest.fn();
const mockSet = jest.fn(() => ({ where: mockWhere }));

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(() => ({ set: mockSet })),
  },
}));

import { db } from "@db/db";

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
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
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(getPortalBookings("user_1")).rejects.toThrow("Unauthorized");
  });

  it("throws Unauthorized when authenticated user does not match requested userId", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "other_user" });
    await expect(getPortalBookings("user_1")).rejects.toThrow("Unauthorized");
  });

  it("returns mapped bookings for authenticated user", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);

    const mockFromWhere = jest.fn().mockResolvedValue([mockBookingRow]);
    const mockFrom = jest.fn(() => ({ where: mockFromWhere }));
    (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

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
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(updateBookingStatus(1, "confirmed")).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("calls db.update with correct status and ownership condition for 'confirmed'", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);

    await updateBookingStatus(1, "confirmed");

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({ status: "confirmed" });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });

  it("calls db.update with correct status for 'cancelled'", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);

    await updateBookingStatus(2, "cancelled");

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({ status: "cancelled" });
  });
});
