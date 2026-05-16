import { GET } from "@/app/api/portal/[token]/availability/route";
import { db } from "@db/db";
import { NextRequest } from "next/server";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

const makeRequest = (token: string, params: Record<string, string>) => {
  const url = new URL(
    `http://localhost/api/portal/${token}/availability?${new URLSearchParams(params)}`
  );
  return new NextRequest(url);
};

const makeParams = (token: string) => Promise.resolve({ token });

const mockPortal = {
  id: 1,
  clientId: 10,
  userId: "user_1",
  token: "test-token",
  enabled: true,
  settings: {
    meetingSchedulingEnabled: true,
    availability: {
      weeklySchedule: {
        monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
        tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
        wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
        thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
        friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
        saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      },
      meetingDurations: [30, 60],
      bufferMinutes: 15,
      timezone: "America/New_York",
    },
  },
};

describe("GET /api/portal/[token]/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when date param is missing", async () => {
    const req = makeRequest("test-token", { duration: "30" });
    const res = await GET(req, { params: makeParams("test-token") });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing date or duration");
  });

  it("returns 400 when duration param is missing", async () => {
    const req = makeRequest("test-token", { date: "2026-05-01" });
    const res = await GET(req, { params: makeParams("test-token") });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing date or duration");
  });

  it("returns 400 for invalid duration (not in allowed list)", async () => {
    const req = makeRequest("test-token", {
      date: "2026-05-01",
      duration: "25",
    });
    const res = await GET(req, { params: makeParams("test-token") });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid duration");
  });

  it("returns 404 when token does not exist", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn(() => ({ limit: mockLimit }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    (db.select as Mock).mockReturnValue({ from: mockFrom });

    const req = makeRequest("bad-token", {
      date: "2026-05-05",
      duration: "30",
    });
    const res = await GET(req, { params: makeParams("bad-token") });
    expect(res.status).toBe(404);
  });

  it("returns 404 when portal is disabled", async () => {
    const mockLimit = vi
      .fn()
      .mockResolvedValue([{ ...mockPortal, enabled: false }]);
    const mockWhere = vi.fn(() => ({ limit: mockLimit }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    (db.select as Mock).mockReturnValue({ from: mockFrom });

    const req = makeRequest("test-token", {
      date: "2026-05-05",
      duration: "30",
    });
    const res = await GET(req, { params: makeParams("test-token") });
    expect(res.status).toBe(404);
  });

  it("returns empty slots when meetingSchedulingEnabled is false", async () => {
    const portal = {
      ...mockPortal,
      settings: { ...mockPortal.settings, meetingSchedulingEnabled: false },
    };
    const mockLimit = vi.fn().mockResolvedValue([portal]);
    const mockWhere = vi.fn(() => ({ limit: mockLimit }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    (db.select as Mock).mockReturnValue({ from: mockFrom });

    const req = makeRequest("test-token", {
      date: "2026-05-05",
      duration: "30",
    });
    const res = await GET(req, { params: makeParams("test-token") });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.slots).toEqual([]);
  });

  it("returns empty slots when the day is disabled in weeklySchedule", async () => {
    // 2026-05-09 is a Saturday
    const mockLimit = vi.fn().mockResolvedValue([mockPortal]);
    const mockWhere = vi.fn(() => ({ limit: mockLimit }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    (db.select as Mock).mockReturnValue({ from: mockFrom });

    const req = makeRequest("test-token", {
      date: "2026-05-09",
      duration: "30",
    });
    const res = await GET(req, { params: makeParams("test-token") });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.slots).toEqual([]);
  });

  it("returns slot list for an enabled weekday", async () => {
    // 2026-05-04 is a Monday, 09:00–10:00 → two 30-min slots
    const callCount = { n: 0 };

    (db.select as Mock).mockImplementation(() => {
      callCount.n++;
      if (callCount.n === 1) {
        // Portal lookup
        const mockLimit = vi.fn().mockResolvedValue([mockPortal]);
        const mockWhere = vi.fn(() => ({ limit: mockLimit }));
        return { from: vi.fn(() => ({ where: mockWhere })) };
      } else {
        // Bookings lookup – no existing bookings
        const mockWhere = vi.fn().mockResolvedValue([]);
        return { from: vi.fn(() => ({ where: mockWhere })) };
      }
    });

    // Use a far-future date so isPast won't filter slots out
    const req = makeRequest("test-token", {
      date: "2030-05-06",
      duration: "30",
    });
    const res = await GET(req, { params: makeParams("test-token") });
    expect(res.status).toBe(200);
    const json = await res.json();
    // 09:00–17:00 in 30-min increments = 16 slots
    expect(json.slots).toHaveLength(16);
    expect(json.slots.every((s: { available: boolean }) => s.available)).toBe(
      true
    );
  });

  it("marks conflicting slots as unavailable", async () => {
    const callCount = { n: 0 };

    (db.select as Mock).mockImplementation(() => {
      callCount.n++;
      if (callCount.n === 1) {
        const mockLimit = vi.fn().mockResolvedValue([mockPortal]);
        const mockWhere = vi.fn(() => ({ limit: mockLimit }));
        return { from: vi.fn(() => ({ where: mockWhere })) };
      } else {
        // Booked slot at 09:00 for 30 min
        const bookedDateTime = new Date("2030-05-06T09:00:00");
        const mockWhere = vi
          .fn()
          .mockResolvedValue([{ dateTime: bookedDateTime, duration: 30 }]);
        return { from: vi.fn(() => ({ where: mockWhere })) };
      }
    });

    const req = makeRequest("test-token", {
      date: "2030-05-06",
      duration: "30",
    });
    const res = await GET(req, { params: makeParams("test-token") });
    const json = await res.json();

    // First slot (09:00) should be unavailable due to the booking + 15-min buffer
    const firstSlot = json.slots[0];
    expect(firstSlot.available).toBe(false);
  });
});
