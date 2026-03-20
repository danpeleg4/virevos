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

jest.mock("@/lib/plan_limits", () => ({
  assertHasAiAssistant: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/clients", () => ({
  addAClient: jest.fn(),
  updateExistingClient: jest.fn(),
}));

jest.mock("@/lib/meetings", () => ({
  getPastMeetingTranscript: jest.fn(),
}));

jest.mock("@/lib/projects", () => ({
  createProject: jest.fn(),
  updateProject: jest.fn(),
}));

jest.mock("@/lib/tasks", () => ({
  addProjectTasksAction: jest.fn(),
  updateTask: jest.fn(),
}));

jest.mock("@/lib/calendar", () => ({
  addMeetingToCalendar: jest.fn(),
  updateEvent: jest.fn(),
}));

async function* mockStreamChunks(content: string) {
  yield { choices: [{ delta: { content }, finish_reason: null }] };
  yield { choices: [{ delta: {}, finish_reason: "stop" }] };
}

async function* mockStreamToolCall(toolName: string, toolArgs: object) {
  yield {
    choices: [
      {
        delta: {
          tool_calls: [
            { index: 0, id: "tc_1", function: { name: toolName, arguments: "" } },
          ],
        },
        finish_reason: null,
      },
    ],
  };
  yield {
    choices: [
      {
        delta: {
          tool_calls: [
            { index: 0, function: { arguments: JSON.stringify(toolArgs) } },
          ],
        },
        finish_reason: null,
      },
    ],
  };
  yield { choices: [{ delta: {}, finish_reason: "tool_calls" }] };
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockRequest(body: {
    messages: { role: string; content: string }[];
  }) {
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

  it("returns 401 if user is not found in DB", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([]),
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

  const toolTestCases: Array<{ toolName: string; args: object; resultKind: string }> = [
    { toolName: "createProject", args: { name: "Test Project" }, resultKind: "project_created" },
    { toolName: "updateClient", args: { id: 1, name: "Updated" }, resultKind: "client_updated" },
    { toolName: "updateProject", args: { id: 1, status: "completed" }, resultKind: "project_updated" },
    { toolName: "createTask", args: { title: "New Task" }, resultKind: "task_created" },
    { toolName: "updateTask", args: { id: 1, status: "completed" }, resultKind: "task_updated" },
    { toolName: "createEvent", args: { title: "Meeting", dateTime: "2026-06-01T10:00:00Z", duration: 60 }, resultKind: "event_created" },
    { toolName: "updateEvent", args: { id: "ev-1", title: "Updated" }, resultKind: "event_updated" },
  ];

  it.each(toolTestCases)(
    "executes $toolName tool and streams tool_result event",
    async ({ toolName, args, resultKind }) => {
      (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
      (db.select as jest.Mock).mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ ai_credits: 5 }]),
        }),
      });
      const updateWhere = jest.fn();
      const updateSet = jest.fn(() => ({ where: updateWhere }));
      (db.update as jest.Mock).mockReturnValue({ set: updateSet });

      const { executeTool: mockExecuteTool } = await import("@/lib/ai_tools");
      (mockExecuteTool as jest.Mock).mockResolvedValueOnce({ kind: resultKind, message: "ok" });

      // First call returns tool call stream, second call returns a stop stream
      (openai.chat.completions.create as jest.Mock)
        .mockReturnValueOnce(mockStreamToolCall(toolName, args))
        .mockReturnValueOnce(mockStreamChunks("Done."));

      const res = await POST(mockRequest({ messages: [] }));
      expect(res.status).toBe(200);

      const text = await res.text();
      const lines = text.trim().split("\n").filter(Boolean);
      const events = lines.map((l) => JSON.parse(l));

      expect(mockExecuteTool).toHaveBeenCalledWith(toolName, args);
      expect(events).toContainEqual(
        expect.objectContaining({ type: "tool_result", name: toolName })
      );
      expect(events.at(-1)).toEqual({ type: "done" });
    }
  );
});
