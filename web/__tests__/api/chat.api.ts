import { POST } from "@/app/api/chat/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { NextRequest } from "next/server";
import { openai, tools } from "@/lib/ai_tools";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@/lib/ai_tools", () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
  tools: [],
  executeTool: jest.fn(),
  MODEL: "gpt-4o",
  MAX_STEPS: 5,
}));

jest.mock("@/lib/server_actions/clients", () => ({
  addAClient: jest.fn(),
}));

jest.mock("@/lib/server_actions/meetings", () => ({
  getPastMeetingTranscript: jest.fn(),
}));

async function* mockStreamChunks(content: string) {
  yield { choices: [{ delta: { content }, finish_reason: null }] };
  yield { choices: [{ delta: {}, finish_reason: "stop" }] };
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockRequest(body: { messages: { role: string; content: string }[] }) {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  }

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await POST(mockRequest({ messages: [] }));

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("returns 401 if user has no AI credits", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ ai_credits: 0 }]),
      }),
    });

    const res = await POST(mockRequest({ messages: [] }));

    expect(res.status).toBe(401);
    expect(await res.json()).toBe("No AI Credits");
  });

  it("decrements AI credits and streams a response", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ ai_credits: 2 }]),
      }),
    });

    const updateWhere = jest.fn();
    const updateSet = jest.fn(() => ({ where: updateWhere }));
    (db.update as jest.Mock).mockReturnValue({ set: updateSet });

    (openai.chat.completions.create as jest.Mock).mockReturnValue(
      mockStreamChunks("Hello!")
    );

    const res = await POST(mockRequest({ messages: [] }));

    expect(db.update).toHaveBeenCalled();
    expect(openai.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o",
        tools,
        stream: true,
      })
    );
    expect(res.status).toBe(200);

    // Verify the streamed body contains text_delta and done events
    const text = await res.text();
    const lines = text.trim().split("\n").filter(Boolean);
    const events = lines.map((l) => JSON.parse(l));

    expect(events).toContainEqual({ type: "text_delta", delta: "Hello!" });
    expect(events.at(-1)).toEqual({ type: "done" });
  });
});
