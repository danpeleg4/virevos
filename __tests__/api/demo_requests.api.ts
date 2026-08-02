import { POST } from "@/app/api/demo-requests/route";
import { createDemoRequest } from "@/lib/demo_requests";
import { demoRequestsDrizzle } from "@db/classes/demo_requests_db";
import { resendApiClient } from "@/api_client/resend_client";
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

vi.mock("@/lib/demo_requests", () => ({
  createDemoRequest: vi.fn(),
}));

vi.mock("@db/classes/demo_requests_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  demoRequestsDrizzle: { __sentinel: "demoRequestsDrizzle" },
}));

vi.mock("@/api_client/resend_client", () => ({
  // sentinel — the route must pass this exact client into the lib fn
  resendApiClient: { __sentinel: "resendApiClient" },
}));

const validInput = {
  name: "Jane Prospect",
  email: "jane@prospect.com",
  company: "Prospect Inc",
  message: "Interested in a demo",
};

const makeRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/demo-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/demo-requests", () => {
  it("creates the demo request via the wired singletons", async () => {
    (createDemoRequest as Mock).mockResolvedValueOnce({
      success: true,
      id: 7,
    });

    const res = await POST(makeRequest(validInput));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: 7 });
    expect(createDemoRequest).toHaveBeenCalledWith(
      validInput,
      demoRequestsDrizzle,
      resendApiClient
    );
  });

  it("propagates a ValidationError status", async () => {
    (createDemoRequest as Mock).mockRejectedValueOnce(
      new ValidationError("email is not a valid email")
    );

    const res = await POST(makeRequest({ ...validInput, email: "bad" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "email is not a valid email",
    });
  });

  it("returns 429 when rate limited", async () => {
    (createDemoRequest as Mock).mockRejectedValueOnce(
      new ValidationError("Too many requests", 429)
    );

    const res = await POST(makeRequest(validInput));

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Too many requests" });
  });

  it("returns 500 when the lib call throws unexpectedly", async () => {
    (createDemoRequest as Mock).mockRejectedValueOnce(new Error("boom"));

    const res = await POST(makeRequest(validInput));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to submit demo request",
    });
  });
});
