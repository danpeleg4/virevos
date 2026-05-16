import { NextRequest } from "next/server";
import { GET as getClient } from "@/app/api/clients/[id]/route";
import { GET as getClientCases } from "@/app/api/clients/[id]/cases/route";
import { GET as getClientEmails } from "@/app/api/clients/[id]/outlook-emails/route";
import { GET as getClientPortal } from "@/app/api/clients/[id]/portal/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

const mockUser = { id: "user_abc" };
const req = {} as NextRequest;

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/clients/[id]", () => {
  const params = Promise.resolve({ id: "42" });

  it("returns 401 when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    const res = await getClient(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid id", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    const res = await getClient(req, {
      params: Promise.resolve({ id: "not-a-number" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when client not found", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);

    const limit = vi.fn().mockResolvedValue([]);
    const groupBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ groupBy }));
    const leftJoin = vi.fn(() => ({ where }));
    const from = vi.fn(() => ({ leftJoin }));
    (db.select as Mock).mockReturnValueOnce({ from });

    const res = await getClient(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns client + portal=null when found with no portal", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);

    const clientRow = {
      id: 42,
      name: "Acme",
      email: "a@b.com",
      phone: "555",
      status: "active",
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      totalCases: 0,
      completedCases: 0,
      activeCases: 0,
    };

    // First db.select() call — client lookup
    const limit1 = vi.fn().mockResolvedValue([clientRow]);
    const groupBy = vi.fn(() => ({ limit: limit1 }));
    const where1 = vi.fn(() => ({ groupBy }));
    const leftJoin = vi.fn(() => ({ where: where1 }));
    const from1 = vi.fn(() => ({ leftJoin }));

    // Second db.select() call — portal lookup
    const limit2 = vi.fn().mockResolvedValue([]);
    const where2 = vi.fn(() => ({ limit: limit2 }));
    const from2 = vi.fn(() => ({ where: where2 }));

    (db.select as Mock)
      .mockReturnValueOnce({ from: from1 })
      .mockReturnValueOnce({ from: from2 });

    const res = await getClient(req, { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.client).toEqual(clientRow);
    expect(json.portal).toBeNull();
  });

  it("returns 500 on db error", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await getClient(req, { params });
    expect(res.status).toBe(500);
  });
});

describe("GET /api/clients/[id]/cases", () => {
  const params = Promise.resolve({ id: "5" });

  it("returns 401 when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    const res = await getClientCases(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns cases-with-stats for the client", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);

    const rows = [
      {
        id: 1,
        name: "Case A",
        description: null,
        status: "active",
        dueDate: null,
        priority: "low",
        clientId: 5,
        userId: mockUser.id,
        clientName: "Acme",
        totalTasks: 4,
        completedTasks: 1,
      },
    ];

    const groupBy = vi.fn().mockResolvedValue(rows);
    const where = vi.fn(() => ({ groupBy }));
    const leftJoin2 = vi.fn(() => ({ where }));
    const leftJoin1 = vi.fn(() => ({ leftJoin: leftJoin2 }));
    const from = vi.fn(() => ({ leftJoin: leftJoin1 }));
    (db.select as Mock).mockReturnValueOnce({ from });

    const res = await getClientCases(req, { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.cases).toHaveLength(1);
    expect(json.cases[0].stats.percentage).toBe(25);
  });
});

describe("GET /api/clients/[id]/outlook-emails", () => {
  const params = Promise.resolve({ id: "5" });

  it("returns 401 when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    const res = await getClientEmails(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns emails for the client", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);

    const emails = [
      {
        id: 1,
        subject: "Hi",
        snippet: "hello",
        fromEmail: "x@y.com",
        fromName: "X",
        toEmails: ["a@b.com"],
        isRead: false,
        isSent: false,
        hasAttachments: false,
        sentAt: new Date().toISOString(),
      },
    ];

    const limit = vi.fn().mockResolvedValue(emails);
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ orderBy }));
    const from = vi.fn(() => ({ where }));
    (db.select as Mock).mockReturnValueOnce({ from });

    const res = await getClientEmails(req, { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.emails).toEqual(emails);
  });
});

describe("GET /api/clients/[id]/portal", () => {
  const params = Promise.resolve({ id: "5" });

  it("returns 401 when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    const res = await getClientPortal(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns portal=null when no portal exists for the client", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);

    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ limit }));
    const leftJoin = vi.fn(() => ({ where }));
    const from = vi.fn(() => ({ leftJoin }));
    (db.select as Mock).mockReturnValueOnce({ from });

    const res = await getClientPortal(req, { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.portal).toBeNull();
  });

  it("returns the portal record with a portalUrl when present", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";

    const row = {
      id: 7,
      clientId: 5,
      token: "tok123",
      enabled: true,
      settings: { chatEnabled: true },
      lastAccessedAt: null,
      createdAt: new Date().toISOString(),
      clientName: "Acme",
      clientEmail: "a@b.com",
    };

    const limit = vi.fn().mockResolvedValue([row]);
    const where = vi.fn(() => ({ limit }));
    const leftJoin = vi.fn(() => ({ where }));
    const from = vi.fn(() => ({ leftJoin }));
    (db.select as Mock).mockReturnValueOnce({ from });

    const res = await getClientPortal(req, { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.portal.portalUrl).toBe("https://example.com/portal/tok123");
    expect(json.portal.id).toBe(7);
  });
});
