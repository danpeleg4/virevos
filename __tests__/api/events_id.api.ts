import { GET } from "@/app/api/events/[id]/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => {
  const where = jest.fn();
  return {
    db: {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({ where }),
      }),
    },
    where,
  };
});

const { where } = jest.requireMock("@db/db") as { where: jest.Mock };

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/events/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 404 when meeting not found", async () => {
    where.mockResolvedValueOnce([]);
    const res = await GET({} as Request, params("missing"));
    expect(res.status).toBe(404);
  });

  it("derives 'active' for a past upcoming meeting", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    where.mockResolvedValueOnce([
      {
        id: "evt_1",
        userId: "user_1",
        isMeeting: true,
        status: "upcoming",
        dateTime: new Date(Date.now() - 60_000),
      },
    ]);

    const res = await GET({} as Request, params("evt_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.meeting.status).toBe("active");
    expect(json.isHost).toBe(true);
  });

  it("preserves 'ended' status without re-deriving", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    where.mockResolvedValueOnce([
      {
        id: "evt_1",
        userId: "user_1",
        isMeeting: true,
        status: "ended",
        dateTime: new Date(Date.now() - 60_000),
      },
    ]);

    const res = await GET({} as Request, params("evt_1"));
    const json = await res.json();

    expect(json.meeting.status).toBe("ended");
  });

  it("keeps 'upcoming' for a future meeting", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    where.mockResolvedValueOnce([
      {
        id: "evt_1",
        userId: "user_1",
        isMeeting: true,
        status: "upcoming",
        dateTime: new Date(Date.now() + 60 * 60_000),
      },
    ]);

    const res = await GET({} as Request, params("evt_1"));
    const json = await res.json();

    expect(json.meeting.status).toBe("upcoming");
  });

  it("isHost is false when current user differs", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_2" });
    where.mockResolvedValueOnce([
      {
        id: "evt_1",
        userId: "user_1",
        isMeeting: true,
        status: "upcoming",
        dateTime: new Date(Date.now() + 60 * 60_000),
      },
    ]);

    const res = await GET({} as Request, params("evt_1"));
    const json = await res.json();

    expect(json.isHost).toBe(false);
  });
});
