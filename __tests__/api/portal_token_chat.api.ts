import { POST } from "@/app/api/portal/[token]/chat/route";
import { sendPortalChatMessage } from "@/lib/portal/portal_chat";
import { portalChatDrizzle } from "@db/portal_chat_db";
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

vi.mock("@/lib/portal/portal_chat", () => ({
  sendPortalChatMessage: vi.fn(),
}));

vi.mock("@db/portal_chat_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  portalChatDrizzle: { __sentinel: "portalChatDrizzle" },
}));

const makeRequest = (token: string, body: unknown) =>
  new NextRequest(`http://localhost/api/portal/${token}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const makeParams = (token: string) => Promise.resolve({ token });

describe("POST /api/portal/[token]/chat", () => {
  it("sends the message via the wired portalChatDrizzle instance", async () => {
    const message = { id: 1, senderType: "client", body: "hi" };
    (sendPortalChatMessage as Mock).mockResolvedValueOnce(message);

    const res = await POST(makeRequest("tok", { message: "hi" }), {
      params: makeParams("tok"),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(message);
    expect(sendPortalChatMessage).toHaveBeenCalledWith(
      "tok",
      "hi",
      portalChatDrizzle
    );
  });

  it("propagates a ValidationError status", async () => {
    (sendPortalChatMessage as Mock).mockRejectedValueOnce(
      new ValidationError("Portal not found or disabled", 404)
    );

    const res = await POST(makeRequest("bad", { message: "hi" }), {
      params: makeParams("bad"),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "Portal not found or disabled",
    });
  });

  it("returns 500 when the lib call throws", async () => {
    (sendPortalChatMessage as Mock).mockRejectedValueOnce(new Error("boom"));

    const res = await POST(makeRequest("tok", { message: "hi" }), {
      params: makeParams("tok"),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to send message" });
  });
});
