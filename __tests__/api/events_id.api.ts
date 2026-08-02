import { GET, PATCH, DELETE } from "@/app/api/events/[id]/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  deleteEventFromCalendar,
  getEventWithHost,
  updateEvent,
  updateEventDateTime,
} from "@/lib/workspace/calendar";
import { calendarDrizzle } from "@db/classes/calendar_db";
import { graphCalendarService } from "@/api_client/ms_graph/graph_calendar_service";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { startMeeting, markActionItemAdded } from "@/lib/workspace/meetings";
import { meetingsDrizzle } from "@db/classes/meetings_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/calendar", () => ({
  deleteEventFromCalendar: vi.fn(),
  getEventWithHost: vi.fn(),
  updateEvent: vi.fn(),
  updateEventDateTime: vi.fn(),
}));

vi.mock("@db/classes/calendar_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  calendarDrizzle: { __sentinel: "calendarDrizzle" },
}));

vi.mock("@/api_client/ms_graph/graph_calendar_service", () => ({
  graphCalendarService: { __sentinel: "graphCalendarService" },
}));

vi.mock("@db/classes/outlook_db", () => ({
  outlookDrizzle: { __sentinel: "outlookDrizzle" },
}));

vi.mock("@/api_client/ms_graph/graph_auth_service", () => ({
  graphAuthService: { __sentinel: "graphAuthService" },
}));

vi.mock("@/lib/workspace/meetings", () => ({
  startMeeting: vi.fn(),
  markActionItemAdded: vi.fn(),
}));

vi.mock("@db/classes/meetings_db", () => ({
  meetingsDrizzle: { __sentinel: "meetingsDrizzle" },
}));

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const getRequest = () => ({}) as Request;

const patchRequest = (body: unknown) =>
  new Request("http://localhost/api/events/evt-1", {
    method: "PATCH",
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

describe("GET /api/events/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET(getRequest(), makeCtx("evt-1"));

    expect(res.status).toBe(401);
    expect(getEventWithHost).not.toHaveBeenCalled();
  });

  it("returns the meeting with host flag from the wired db", async () => {
    const payload = { meeting: { id: "evt-1" }, isHost: true };
    (getEventWithHost as Mock).mockResolvedValueOnce(payload);

    const res = await GET(getRequest(), makeCtx("evt-1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(payload);
    expect(getEventWithHost).toHaveBeenCalledWith("evt-1", calendarDrizzle);
  });

  it("returns 404 when the meeting is missing", async () => {
    (getEventWithHost as Mock).mockResolvedValueOnce(null);

    const res = await GET(getRequest(), makeCtx("ghost"));

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/events/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await PATCH(
      patchRequest({ type: "update", data: { title: "X" } }),
      makeCtx("evt-1")
    );

    expect(res.status).toBe(401);
    expect(updateEvent).not.toHaveBeenCalled();
  });

  it("dispatches update to updateEvent with the wired deps", async () => {
    const res = await PATCH(
      patchRequest({ type: "update", data: { title: "Renamed" } }),
      makeCtx("evt-1")
    );

    expect(res.status).toBe(200);
    expect(updateEvent).toHaveBeenCalledWith(
      { title: "Renamed", id: "evt-1" },
      calendarDrizzle,
      graphCalendarService,
      outlookDrizzle,
      graphAuthService
    );
  });

  it("dispatches reschedule to updateEventDateTime with a parsed date", async () => {
    (updateEventDateTime as Mock).mockResolvedValueOnce({ success: true });
    const dateTime = "2099-07-01T09:00:00.000Z";

    const res = await PATCH(
      patchRequest({ type: "reschedule", data: { dateTime } }),
      makeCtx("evt-1")
    );

    expect(res.status).toBe(200);
    expect(updateEventDateTime).toHaveBeenCalledWith(
      "evt-1",
      new Date(dateTime),
      calendarDrizzle,
      graphCalendarService,
      outlookDrizzle,
      graphAuthService
    );
  });

  it("returns 400 for an invalid reschedule date", async () => {
    const res = await PATCH(
      patchRequest({ type: "reschedule", data: { dateTime: "bogus" } }),
      makeCtx("evt-1")
    );

    expect(res.status).toBe(400);
    expect(updateEventDateTime).not.toHaveBeenCalled();
  });

  it("returns 400 for an unknown type", async () => {
    const res = await PATCH(patchRequest({ type: "bogus" }), makeCtx("evt-1"));

    expect(res.status).toBe(400);
  });

  it("returns 500 when the update fails", async () => {
    (updateEvent as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await PATCH(
      patchRequest({ type: "update", data: { title: "X" } }),
      makeCtx("evt-1")
    );

    expect(res.status).toBe(500);
  });

  it("dispatches start to startMeeting with the wired db", async () => {
    const res = await PATCH(patchRequest({ type: "start" }), makeCtx("evt-1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: "evt-1" });
    expect(startMeeting).toHaveBeenCalledWith("evt-1", meetingsDrizzle);
  });

  it("dispatches mark-action-item to markActionItemAdded with the wired db", async () => {
    const res = await PATCH(
      patchRequest({ type: "mark-action-item", data: { itemIndex: 2 } }),
      makeCtx("evt-1")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: "evt-1" });
    expect(markActionItemAdded).toHaveBeenCalledWith(
      "evt-1",
      2,
      meetingsDrizzle
    );
  });
});

describe("DELETE /api/events/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await DELETE(getRequest(), makeCtx("evt-1"));

    expect(res.status).toBe(401);
    expect(deleteEventFromCalendar).not.toHaveBeenCalled();
  });

  it("deletes the event through the lib fn with the wired deps", async () => {
    (deleteEventFromCalendar as Mock).mockResolvedValueOnce({ success: true });

    const res = await DELETE(getRequest(), makeCtx("evt-1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(deleteEventFromCalendar).toHaveBeenCalledWith(
      "evt-1",
      calendarDrizzle,
      graphCalendarService,
      outlookDrizzle,
      graphAuthService
    );
  });

  it("passes through a not-found result", async () => {
    (deleteEventFromCalendar as Mock).mockResolvedValueOnce({
      success: false,
      error: "Meeting not found",
    });

    const res = await DELETE(getRequest(), makeCtx("ghost"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: false,
      error: "Meeting not found",
    });
  });

  it("returns 500 when the delete fails", async () => {
    (deleteEventFromCalendar as Mock).mockRejectedValueOnce(
      new Error("db down")
    );

    const res = await DELETE(getRequest(), makeCtx("evt-1"));

    expect(res.status).toBe(500);
  });
});
