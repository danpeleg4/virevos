import { GET } from "@/app/api/events/[id]/route";
import { getCurrentUser } from "@/lib/supabase/auth";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const { where } = vi.hoisted(() => ({ where: vi.fn() }));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where }),
    }),
  },
  where,
}));

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/events/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when meeting not found", async () => {
    where.mockResolvedValueOnce([]);
    const res = await GET({} as Request, params("missing"));
    expect(res.status).toBe(404);
  });

  it("derives 'active' for a past upcoming meeting", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
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
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
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
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
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
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_2" });
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
