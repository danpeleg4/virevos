import { GET, POST } from "@/app/api/events/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { addMeetingToCalendar, getEvents } from "@/lib/workspace/calendar";
import { calendarDrizzle } from "@db/classes/calendar_db";
import { graphCalendarService } from "@/api_client/ms_graph/graph_calendar_service";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/calendar", () => ({
  addMeetingToCalendar: vi.fn(),
  getEvents: vi.fn(),
}));

vi.mock("@db/classes/calendar_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  calendarDrizzle: { __sentinel: "calendarDrizzle" },
}));

vi.mock("@/api_client/ms_graph/graph_calendar_service", () => ({
  // sentinel — the route must pass this exact service into the lib fns
  graphCalendarService: { __sentinel: "graphCalendarService" },
}));

vi.mock("@db/classes/outlook_db", () => ({
  outlookDrizzle: { __sentinel: "outlookDrizzle" },
}));

vi.mock("@/api_client/ms_graph/graph_auth_service", () => ({
  graphAuthService: { __sentinel: "graphAuthService" },
}));

const postRequest = (body: unknown) =>
  new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/events", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(getEvents).not.toHaveBeenCalled();
  });

  it("returns events from the wired db", async () => {
    const rows = [{ id: "evt-1", title: "Team Sync", status: "upcoming" }];
    (getEvents as Mock).mockResolvedValueOnce(rows);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rows);
    expect(getEvents).toHaveBeenCalledWith(calendarDrizzle);
  });

  it("returns 500 when the query fails", async () => {
    (getEvents as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await GET();

    expect(res.status).toBe(500);
  });
});

describe("POST /api/events", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await POST(postRequest({ title: "New Meeting" }));

    expect(res.status).toBe(401);
    expect(addMeetingToCalendar).not.toHaveBeenCalled();
  });

  it("creates the event through the lib fn with the wired deps", async () => {
    const created = { id: "evt-new", title: "New Meeting" };
    (addMeetingToCalendar as Mock).mockResolvedValueOnce(created);

    const res = await POST(postRequest({ title: "New Meeting" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(created);
    expect(addMeetingToCalendar).toHaveBeenCalledWith(
      { title: "New Meeting" },
      calendarDrizzle,
      graphCalendarService,
      outlookDrizzle,
      graphAuthService
    );
  });

  it("returns 500 when the insert fails", async () => {
    (addMeetingToCalendar as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await POST(postRequest({ title: "New Meeting" }));

    expect(res.status).toBe(500);
  });
});
