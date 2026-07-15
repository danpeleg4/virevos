import { POST } from "@/app/api/meetings/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createInstantMeeting } from "@/lib/workspace/meetings";
import { meetingsDrizzle } from "@db/meetings_db";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/meetings", () => ({
  createInstantMeeting: vi.fn(),
}));

vi.mock("@db/meetings_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  meetingsDrizzle: { __sentinel: "meetingsDrizzle" },
}));

const postRequest = (body: unknown) =>
  new Request("http://localhost/api/meetings", {
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

describe("POST /api/meetings", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await POST(postRequest({ title: "Standup" }));

    expect(res.status).toBe(401);
    expect(createInstantMeeting).not.toHaveBeenCalled();
  });

  it("creates the meeting through the lib fn with the wired db", async () => {
    const created = { id: "abc123", link: "https://virevos.com/meet/abc123" };
    (createInstantMeeting as Mock).mockResolvedValueOnce(created);

    const res = await POST(postRequest({ title: "Standup" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(created);
    expect(createInstantMeeting).toHaveBeenCalledWith(
      "Standup",
      meetingsDrizzle
    );
  });

  it("propagates a ValidationError status from the lib fn", async () => {
    (createInstantMeeting as Mock).mockRejectedValueOnce(
      new ValidationError("title is required", 400)
    );

    const res = await POST(postRequest({}));

    expect(res.status).toBe(400);
  });

  it("returns 500 when the insert fails", async () => {
    (createInstantMeeting as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await POST(postRequest({ title: "Standup" }));

    expect(res.status).toBe(500);
  });
});
