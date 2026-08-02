import { POST } from "@/app/api/clients/[id]/portal/route";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { savePortalSettings } from "@/lib/portal/portal_settings";
import { portalDrizzle } from "@db/classes/portal_db";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/portal/portal_settings", () => ({
  savePortalSettings: vi.fn(),
}));

vi.mock("@db/classes/portal_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  portalDrizzle: { __sentinel: "portalDrizzle" },
}));

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const postRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/clients/1/portal", {
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

describe("POST /api/clients/[id]/portal", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await POST(postRequest({ enabled: true }), makeCtx("1"));

    expect(res.status).toBe(401);
    expect(savePortalSettings).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid client id", async () => {
    const res = await POST(postRequest({ enabled: true }), makeCtx("abc"));

    expect(res.status).toBe(400);
    expect(savePortalSettings).not.toHaveBeenCalled();
  });

  it("saves settings through the lib fn with the wired db", async () => {
    const saved = { id: 3, portalUrl: "https://app.test/portal/tok" };
    (savePortalSettings as Mock).mockResolvedValueOnce(saved);

    const res = await POST(
      postRequest({ enabled: true, settings: { title: "Portal" } }),
      makeCtx("1")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(saved);
    expect(savePortalSettings).toHaveBeenCalledWith(
      { enabled: true, settings: { title: "Portal" }, clientId: 1 },
      portalDrizzle
    );
  });

  it("propagates a ValidationError status", async () => {
    (savePortalSettings as Mock).mockRejectedValueOnce(
      new ValidationError("Client not found", 404)
    );

    const res = await POST(postRequest({ enabled: true }), makeCtx("1"));

    expect(res.status).toBe(404);
  });

  it("returns 500 when the save fails", async () => {
    (savePortalSettings as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await POST(postRequest({ enabled: true }), makeCtx("1"));

    expect(res.status).toBe(500);
  });
});
