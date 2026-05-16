import { GET } from "@/app/api/events/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { events } from "@db/schema";
import { eq } from "drizzle-orm";

// Mocks
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    query: {
      events: {
        findMany: vi.fn(),
      },
    },
  },
}));

// Tests
describe("GET /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("returns events for authenticated user", async () => {
    const mockUser = { id: "user_123" };

    const mockEvents = [
      {
        id: "event_1",
        title: "Meeting",
        attendees: [{ id: "a1", email: "test@example.com" }],
      },
    ];

    (currentUser as Mock).mockResolvedValue(mockUser);
    (db.query.events.findMany as Mock).mockResolvedValue(mockEvents);

    const res = await GET();
    const json = await res.json();

    // Response
    expect(res.status).toBe(200);
    expect(json).toEqual(mockEvents);

    // DB call
    expect(db.query.events.findMany).toHaveBeenCalledWith({
      where: eq(events.userId, mockUser.id),
      with: {
        attendees: true,
      },
    });
  });

  it("derives 'active' status for past meetings whose stored status is 'upcoming'", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_123" });
    (db.query.events.findMany as Mock).mockResolvedValue([
      {
        id: "evt_past",
        title: "Started already",
        isMeeting: true,
        status: "upcoming",
        dateTime: new Date(Date.now() - 60_000).toISOString(),
      },
      {
        id: "evt_future",
        title: "Later today",
        isMeeting: true,
        status: "upcoming",
        dateTime: new Date(Date.now() + 60 * 60_000).toISOString(),
      },
    ]);

    const res = await GET();
    const json = await res.json();

    expect(json[0].status).toBe("active");
    expect(json[1].status).toBe("upcoming");
  });

  it("does not modify status for non-meeting events", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_123" });
    (db.query.events.findMany as Mock).mockResolvedValue([
      {
        id: "evt_1",
        title: "Block",
        isMeeting: false,
        status: "upcoming",
        dateTime: new Date(Date.now() - 60_000).toISOString(),
      },
    ]);

    const res = await GET();
    const json = await res.json();

    expect(json[0].status).toBe("upcoming");
  });
});
