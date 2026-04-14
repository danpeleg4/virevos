import { GET, POST } from "@/app/api/integrations/outlook/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => ({
  db: {
    delete: jest.fn(),
    select: jest.fn(),
  },
}));

jest.mock("@/lib/outlook_sync", () => ({
  removeSubscriptions: jest.fn().mockResolvedValue(undefined),
}));

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/integrations/outlook", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/integrations/outlook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("returns connected=true when token exists and is connected", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ connected: true }]),
        }),
      }),
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: true });
  });

  it("returns connected=false when no token exists", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: false });
  });
});

describe("POST /api/integrations/outlook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest({ action: "status" }));

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("disconnects outlook account", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    const whereMock = jest.fn();
    (db.delete as jest.Mock).mockReturnValue({
      where: whereMock,
    });

    const res = await POST(makeRequest({ action: "disconnect" }));

    expect(db.delete).toHaveBeenCalled();
    expect(whereMock).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("returns connected=true when token exists and is connected", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ connected: true }]),
        }),
      }),
    });

    const res = await POST(makeRequest({ action: "status" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: true });
  });

  it("returns connected=false when no token exists", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });

    const res = await POST(makeRequest({ action: "status" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: false });
  });

  it("returns 405 for unsupported action", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const res = await POST(makeRequest({ action: "unknown" }));

    expect(res.status).toBe(405);
    expect(await res.text()).toBe("Method not allowed");
  });
});
