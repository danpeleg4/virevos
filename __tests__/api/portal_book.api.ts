import { POST } from "@/app/api/portal/[token]/book/route";
import { db } from "@db/db";
import { NextRequest } from "next/server";

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));

const makeRequest = (token: string, body: object) =>
  new NextRequest(`http://localhost/api/portal/${token}/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

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
      meetingDurations: [30, 60],
      bufferMinutes: 15,
    },
  },
};

describe("POST /api/portal/[token]/book", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when clientName is missing", async () => {
    const req = makeRequest("test-token", {
      clientEmail: "a@b.com",
      dateTime: "2026-06-01T10:00:00.000Z",
      duration: 30,
    });
    const res = await POST(req, { params: makeParams("test-token") });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing required fields");
  });

  it("returns 400 when clientEmail is missing", async () => {
    const req = makeRequest("test-token", {
      clientName: "Alice",
      dateTime: "2026-06-01T10:00:00.000Z",
      duration: 30,
    });
    const res = await POST(req, { params: makeParams("test-token") });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing required fields");
  });

  it("returns 400 for invalid email format", async () => {
    const req = makeRequest("test-token", {
      clientName: "Alice",
      clientEmail: "not-an-email",
      dateTime: "2026-06-01T10:00:00.000Z",
      duration: 30,
    });
    const res = await POST(req, { params: makeParams("test-token") });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid email");
  });

  it("returns 404 when token is unknown", async () => {
    const mockLimit = jest.fn().mockResolvedValue([]);
    const mockWhere = jest.fn(() => ({ limit: mockLimit }));
    const mockFrom = jest.fn(() => ({ where: mockWhere }));
    (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

    const req = makeRequest("unknown-token", {
      clientName: "Alice",
      clientEmail: "a@b.com",
      dateTime: "2026-06-01T10:00:00.000Z",
      duration: 30,
    });
    const res = await POST(req, { params: makeParams("unknown-token") });
    expect(res.status).toBe(404);
  });

  it("returns 404 when portal is disabled", async () => {
    const mockLimit = jest
      .fn()
      .mockResolvedValue([{ ...mockPortal, enabled: false }]);
    const mockWhere = jest.fn(() => ({ limit: mockLimit }));
    const mockFrom = jest.fn(() => ({ where: mockWhere }));
    (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

    const req = makeRequest("test-token", {
      clientName: "Alice",
      clientEmail: "a@b.com",
      dateTime: "2026-06-01T10:00:00.000Z",
      duration: 30,
    });
    const res = await POST(req, { params: makeParams("test-token") });
    expect(res.status).toBe(404);
  });

  it("returns 403 when meetingSchedulingEnabled is false", async () => {
    const portal = {
      ...mockPortal,
      settings: { ...mockPortal.settings, meetingSchedulingEnabled: false },
    };
    const mockLimit = jest.fn().mockResolvedValue([portal]);
    const mockWhere = jest.fn(() => ({ limit: mockLimit }));
    const mockFrom = jest.fn(() => ({ where: mockWhere }));
    (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

    const req = makeRequest("test-token", {
      clientName: "Alice",
      clientEmail: "a@b.com",
      dateTime: "2026-06-01T10:00:00.000Z",
      duration: 30,
    });
    const res = await POST(req, { params: makeParams("test-token") });
    expect(res.status).toBe(403);
  });

  it("returns 400 when duration is not in allowedDurations", async () => {
    const mockLimit = jest.fn().mockResolvedValue([mockPortal]);
    const mockWhere = jest.fn(() => ({ limit: mockLimit }));
    const mockFrom = jest.fn(() => ({ where: mockWhere }));
    (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

    const req = makeRequest("test-token", {
      clientName: "Alice",
      clientEmail: "a@b.com",
      dateTime: "2026-06-01T10:00:00.000Z",
      duration: 45, // not in [30, 60]
    });
    const res = await POST(req, { params: makeParams("test-token") });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid duration");
  });

  it("successfully creates a booking and returns bookingId", async () => {
    const mockLimit = jest.fn().mockResolvedValue([mockPortal]);
    const mockWhere = jest.fn(() => ({ limit: mockLimit }));
    const mockFrom = jest.fn(() => ({ where: mockWhere }));
    (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

    const mockReturning = jest.fn().mockResolvedValue([{ id: 42 }]);
    const mockValues = jest.fn(() => ({ returning: mockReturning }));
    (db.insert as jest.Mock).mockReturnValue({ values: mockValues });

    const req = makeRequest("test-token", {
      clientName: "Alice",
      clientEmail: "alice@example.com",
      dateTime: "2026-06-01T10:00:00.000Z",
      duration: 30,
      notes: "Discuss Q3 roadmap",
    });
    const res = await POST(req, { params: makeParams("test-token") });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.bookingId).toBe(42);
  });
});
