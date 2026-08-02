import { GET } from "@/app/api/portal/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getPortalBookings } from "@/lib/portal/portal_bookings";
import { portalBookingsDrizzle } from "@db/classes/portal_bookings_db";
import { ValidationError } from "@/lib/util/validation";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/portal/portal_bookings", () => ({
  getPortalBookings: vi.fn(),
}));

vi.mock("@db/classes/portal_bookings_db", () => ({
  portalBookingsDrizzle: { __sentinel: "portalBookingsDrizzle" },
}));

const makeRequest = (query: string) =>
  new NextRequest(`http://localhost/api/portal${query}`);

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/portal?type=bookings", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await GET(makeRequest("?type=bookings"));
    expect(res.status).toBe(401);
    expect(getPortalBookings).not.toHaveBeenCalled();
  });

  it("returns 'No type found' when type is missing", async () => {
    const res = await GET(makeRequest(""));
    expect(await res.json()).toEqual({ error: "No type found" });
    expect(getPortalBookings).not.toHaveBeenCalled();
  });

  it("returns bookings via the wired portalBookingsDrizzle instance", async () => {
    const bookings = [{ id: 1, clientDisplayName: "Acme Corp" }];
    (getPortalBookings as Mock).mockResolvedValueOnce(bookings);

    const res = await GET(makeRequest("?type=bookings"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ bookings });
    expect(getPortalBookings).toHaveBeenCalledWith(
      "user_1",
      portalBookingsDrizzle
    );
  });

  it("propagates a ValidationError status", async () => {
    (getPortalBookings as Mock).mockRejectedValueOnce(
      new ValidationError("Unauthorized", 401)
    );

    const res = await GET(makeRequest("?type=bookings"));

    expect(res.status).toBe(401);
  });

  it("returns 500 when the query fails", async () => {
    (getPortalBookings as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await GET(makeRequest("?type=bookings"));

    expect(res.status).toBe(500);
  });
});
