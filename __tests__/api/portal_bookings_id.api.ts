import { PATCH } from "@/app/api/portal-bookings/[id]/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  acceptBookingWithCalendar,
  updateBookingStatus,
} from "@/lib/portal_bookings";
import { portalBookingsDrizzle } from "@db/portal_bookings_db";
import { calendarDrizzle } from "@db/calendar_db";
import { graphCalendarService } from "@/api_client/ms_graph/graph_calendar_service";
import { outlookDrizzle } from "@db/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { ValidationError } from "@/lib/util/validation";
import { NextRequest } from "next/server";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue(mockUser);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/portal_bookings", () => ({
  acceptBookingWithCalendar: vi.fn(),
  updateBookingStatus: vi.fn(),
}));

vi.mock("@db/portal_bookings_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  portalBookingsDrizzle: { __sentinel: "portalBookingsDrizzle" },
}));

vi.mock("@db/calendar_db", () => ({
  calendarDrizzle: { __sentinel: "calendarDrizzle" },
}));

vi.mock("@/api_client/ms_graph/graph_calendar_service", () => ({
  graphCalendarService: { __sentinel: "graphCalendarService" },
}));

vi.mock("@db/outlook_db", () => ({
  outlookDrizzle: { __sentinel: "outlookDrizzle" },
}));

vi.mock("@/api_client/ms_graph/graph_auth_service", () => ({
  graphAuthService: { __sentinel: "graphAuthService" },
}));

const mockUser = { id: "user_1" };

const makeRequest = (id: string, body: unknown) =>
  new NextRequest(`http://localhost/api/portal-bookings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const makeParams = (id: string) => Promise.resolve({ id });

describe("PATCH /api/portal-bookings/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await PATCH(makeRequest("5", { type: "accept" }), {
      params: makeParams("5"),
    });
    expect(res.status).toBe(401);
    expect(acceptBookingWithCalendar).not.toHaveBeenCalled();
  });

  it("returns 400 when the booking id is not numeric", async () => {
    const res = await PATCH(makeRequest("abc", { type: "accept" }), {
      params: makeParams("abc"),
    });
    expect(res.status).toBe(400);
  });

  it("dispatches accept to acceptBookingWithCalendar with the wired deps", async () => {
    const res = await PATCH(makeRequest("5", { type: "accept" }), {
      params: makeParams("5"),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(acceptBookingWithCalendar).toHaveBeenCalledWith(
      5,
      portalBookingsDrizzle,
      calendarDrizzle,
      graphCalendarService,
      outlookDrizzle,
      graphAuthService
    );
    expect(updateBookingStatus).not.toHaveBeenCalled();
  });

  it("dispatches status to updateBookingStatus with the wired db", async () => {
    const res = await PATCH(
      makeRequest("5", { type: "status", data: { status: "cancelled" } }),
      { params: makeParams("5") }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(updateBookingStatus).toHaveBeenCalledWith(
      5,
      "cancelled",
      portalBookingsDrizzle
    );
    expect(acceptBookingWithCalendar).not.toHaveBeenCalled();
  });

  it("returns 400 when the type is unrecognized", async () => {
    const res = await PATCH(makeRequest("5", { type: "bogus" }), {
      params: makeParams("5"),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No type found" });
  });

  it("propagates a ValidationError status", async () => {
    (updateBookingStatus as Mock).mockRejectedValueOnce(
      new ValidationError("Booking not found", 404)
    );

    const res = await PATCH(
      makeRequest("5", { type: "status", data: { status: "cancelled" } }),
      { params: makeParams("5") }
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Booking not found" });
  });

  it("returns 401 when the lib fn throws Unauthorized", async () => {
    (acceptBookingWithCalendar as Mock).mockRejectedValueOnce(
      new Error("Unauthorized")
    );

    const res = await PATCH(makeRequest("5", { type: "accept" }), {
      params: makeParams("5"),
    });

    expect(res.status).toBe(401);
  });

  it("returns 500 when the lib call throws a generic error", async () => {
    (acceptBookingWithCalendar as Mock).mockRejectedValueOnce(
      new Error("boom")
    );

    const res = await PATCH(makeRequest("5", { type: "accept" }), {
      params: makeParams("5"),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "boom" });
  });
});
