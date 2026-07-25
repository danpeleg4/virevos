import { POST } from "@/app/api/portal/[token]/bookings/route";
import { createPortalBooking } from "@/lib/portal/portal_bookings";
import { portalBookingsDrizzle } from "@db/portal_bookings_db";
import { ValidationError } from "@/lib/util/validation";
import { NextRequest } from "next/server";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

vi.mock("@/lib/portal_bookings", () => ({
  createPortalBooking: vi.fn(),
}));

vi.mock("@db/portal_bookings_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  portalBookingsDrizzle: { __sentinel: "portalBookingsDrizzle" },
}));

const validInput = {
  clientName: "Alice",
  clientEmail: "alice@example.com",
  dateTime: "2026-08-01T10:00:00.000Z",
  duration: 30,
};

const makeRequest = (token: string, body: unknown) =>
  new NextRequest(`http://localhost/api/portal/${token}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const makeParams = (token: string) => Promise.resolve({ token });

describe("POST /api/portal/[token]/bookings", () => {
  it("creates the booking via the wired portalBookingsDrizzle instance", async () => {
    (createPortalBooking as Mock).mockResolvedValueOnce({
      success: true,
      bookingId: 42,
    });

    const res = await POST(makeRequest("tok", validInput), {
      params: makeParams("tok"),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, bookingId: 42 });
    expect(createPortalBooking).toHaveBeenCalledWith(
      "tok",
      validInput,
      portalBookingsDrizzle
    );
  });

  it("propagates a ValidationError status", async () => {
    (createPortalBooking as Mock).mockRejectedValueOnce(
      new ValidationError("Portal not found", 404)
    );

    const res = await POST(makeRequest("bad", validInput), {
      params: makeParams("bad"),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Portal not found" });
  });

  it("returns 500 when the lib call throws", async () => {
    (createPortalBooking as Mock).mockRejectedValueOnce(new Error("boom"));

    const res = await POST(makeRequest("tok", validInput), {
      params: makeParams("tok"),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to create booking" });
  });
});
