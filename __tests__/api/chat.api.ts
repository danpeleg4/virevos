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
    update: jest.fn(),
  },
}));

jest.mock("@/lib/ai_tools", () => ({
  openai: {
    responses: {
      stream: jest.fn(),
    },
  },
  tools: [],
  executeTool: jest.fn(),
  MODEL: "gpt-4o",
  MAX_STEPS: 5,
}));

jest.mock("@/lib/plan_limits", () => ({
  assertCanUseAI: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/clients", () => ({
  addAClient: jest.fn(),
  updateExistingClient: jest.fn(),
}));

jest.mock("@/lib/meetings", () => ({
  getPastMeetingTranscript: jest.fn(),
}));

jest.mock("@/lib/cases", () => ({
  createCase: jest.fn(),
  updateCase: jest.fn(),
}));

jest.mock("@/lib/tasks", () => ({
  addProjectTasksAction: jest.fn(),
  updateTask: jest.fn(),
}));

jest.mock("@/lib/calendar", () => ({
  addMeetingToCalendar: jest.fn(),
  updateEvent: jest.fn(),
}));

function createTextStreamMock(textContent: string, responseId = "resp_1") {
  async function* eventIterator() {
    if (textContent) {
      yield { type: "response.output_text.delta", delta: textContent };
    }
  }
  return {
    [Symbol.asyncIterator]: eventIterator,
    finalResponse: jest.fn().mockResolvedValue({
      id: responseId,
      output: [],
    }),
  };
}

function createToolCallStreamMock(toolName: string, toolArgs: object) {
  async function* eventIterator() {
    // No text events for tool call responses
  }
  return {
    [Symbol.asyncIterator]: eventIterator,
    finalResponse: jest.fn().mockResolvedValue({
      id: "resp_1",
      output: [
        {
          type: "function_call",
          call_id: "call_1",
          name: toolName,
          arguments: JSON.stringify(toolArgs),
        },
      ],
    }),
  };
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockRequest(body: {
    messages: { role: string; content: string }[];
    previousResponseId?: string;
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
    const { assertCanUseAI } = await import("@/lib/plan_limits");
    (assertCanUseAI as jest.Mock).mockRejectedValueOnce(
      new Error("AI credit limit reached")
    );

    const res = await POST(mockRequest({ messages: [] }));

    expect(res.status).toBe(401);
    expect(await res.json()).toBe("No AI Credits");
  });

  it("increments AI credits and streams a response", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const updateWhere = jest.fn();
    const updateSet = jest.fn(() => ({ where: updateWhere }));
    (db.update as jest.Mock).mockReturnValue({ set: updateSet });

    (openai.responses.stream as jest.Mock).mockReturnValue(
      createTextStreamMock("Hello!")
    );

    const res = await POST(mockRequest({ messages: [] }));

    expect(db.update).toHaveBeenCalled();
    expect(openai.responses.stream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o",
        tools,
      })
    );
    expect(res.status).toBe(200);

    const text = await res.text();
    const lines = text.trim().split("\n").filter(Boolean);
    const events = lines.map((l) => JSON.parse(l));

    expect(events).toContainEqual({ type: "text_delta", delta: "Hello!" });
    expect(events.at(-1)).toEqual({ type: "done", response_id: "resp_1" });
  });

  it("uses previousResponseId from request for conversation chaining", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    const updateWhere = jest.fn();
    const updateSet = jest.fn(() => ({ where: updateWhere }));
    (db.update as jest.Mock).mockReturnValue({ set: updateSet });

    (openai.responses.stream as jest.Mock).mockReturnValue(
      createTextStreamMock("Follow-up response.", "resp_2")
    );

    const res = await POST(
      mockRequest({
        messages: [{ role: "user", content: "Follow up" }],
        previousResponseId: "resp_1",
      })
    );

    expect(openai.responses.stream).toHaveBeenCalledWith(
      expect.objectContaining({ previous_response_id: "resp_1" })
    );
    expect(res.status).toBe(200);

    const text = await res.text();
    const events = text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    expect(events.at(-1)).toEqual({ type: "done", response_id: "resp_2" });
  });

  const toolTestCases: Array<{
    toolName: string;
    args: object;
    resultKind: string;
  }> = [
    {
      toolName: "createProject",
      args: { name: "Test Project" },
      resultKind: "project_created",
    },
    {
      toolName: "updateClient",
      args: { id: 1, name: "Updated" },
      resultKind: "client_updated",
    },
    {
      toolName: "updateProject",
      args: { id: 1, status: "completed" },
      resultKind: "project_updated",
    },
    {
      toolName: "createTask",
      args: { title: "New Task" },
      resultKind: "task_created",
    },
    {
      toolName: "updateTask",
      args: { id: 1, status: "completed" },
      resultKind: "task_updated",
    },
    {
      toolName: "createEvent",
      args: {
        title: "Meeting",
        dateTime: "2026-06-01T10:00:00Z",
        duration: 60,
      },
      resultKind: "event_created",
    },
    {
      toolName: "updateEvent",
      args: { id: "ev-1", title: "Updated" },
      resultKind: "event_updated",
    },
  ];

  it.each(toolTestCases)(
    "executes $toolName tool and streams tool_result event",
    async ({ toolName, args, resultKind }) => {
      (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
      const updateWhere = jest.fn();
      const updateSet = jest.fn(() => ({ where: updateWhere }));
      (db.update as jest.Mock).mockReturnValue({ set: updateSet });

      const { executeTool: mockExecuteTool } = await import("@/lib/ai_tools");
      (mockExecuteTool as jest.Mock).mockResolvedValueOnce({
        kind: resultKind,
        message: "ok",
      });

      // First call returns tool call stream, second call returns a text completion
      (openai.responses.stream as jest.Mock)
        .mockReturnValueOnce(createToolCallStreamMock(toolName, args))
        .mockReturnValueOnce(createTextStreamMock("Done."));

      const res = await POST(mockRequest({ messages: [] }));
      expect(res.status).toBe(200);

      const text = await res.text();
      const lines = text.trim().split("\n").filter(Boolean);
      const events = lines.map((l) => JSON.parse(l));

      expect(mockExecuteTool).toHaveBeenCalledWith(toolName, args);
      expect(events).toContainEqual(
        expect.objectContaining({ type: "tool_result", name: toolName })
      );
      expect(events.at(-1)).toMatchObject({ type: "done" });
    }
  );
});
