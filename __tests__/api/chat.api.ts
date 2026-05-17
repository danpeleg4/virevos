import { POST } from "@/app/api/chat/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { NextRequest } from "next/server";
import { openai, tools } from "@/lib/ai/ai_tools";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    update: vi.fn(),
  },
}));

vi.mock("@/lib/ai/ai_tools", () => ({
  openai: {
    responses: {
      stream: vi.fn(),
    },
  },
  tools: [],
  executeTool: vi.fn(),
  MODEL: "gpt-4o",
  MAX_STEPS: 5,
}));

vi.mock("@/lib/plan_limits", () => ({
  assertCanUseAI: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/workspace/clients", () => ({
  addAClient: vi.fn(),
  updateExistingClient: vi.fn(),
}));

vi.mock("@/lib/workspace/meetings", () => ({
  getPastMeetingTranscript: vi.fn(),
}));

vi.mock("@/lib/workspace/cases", () => ({
  createCase: vi.fn(),
  updateCase: vi.fn(),
}));

vi.mock("@/lib/workspace/tasks", () => ({
  addProjectTasksAction: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("@/lib/workspace/calendar", () => ({
  addMeetingToCalendar: vi.fn(),
  updateEvent: vi.fn(),
}));

function createTextStreamMock(textContent: string, responseId = "resp_1") {
  async function* eventIterator() {
    if (textContent) {
      yield { type: "response.output_text.delta", delta: textContent };
    }
  }
  return {
    [Symbol.asyncIterator]: eventIterator,
    finalResponse: vi.fn().mockResolvedValue({
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
    finalResponse: vi.fn().mockResolvedValue({
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
    vi.clearAllMocks();
  });

  function mockRequest(body: {
    messages: { role: string; content: string }[];
    previousResponseId?: string;
  }) {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  }

  it("returns 401 if user is not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await POST(
      mockRequest({ messages: [{ role: "user", content: "Hi" }] })
    );

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("returns 401 if user has no AI credits", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    const { assertCanUseAI } = await import("@/lib/plan_limits");
    (assertCanUseAI as Mock).mockRejectedValueOnce(
      new Error("AI credit limit reached")
    );

    const res = await POST(
      mockRequest({ messages: [{ role: "user", content: "Hi" }] })
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toBe("No AI Credits");
  });

  it("increments AI credits and streams a response", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    const updateWhere = vi.fn();
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    (db.update as Mock).mockReturnValue({ set: updateSet });

    (openai.responses.stream as Mock).mockReturnValue(
      createTextStreamMock("Hello!")
    );

    const res = await POST(
      mockRequest({ messages: [{ role: "user", content: "Hi" }] })
    );

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
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    const updateWhere = vi.fn();
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    (db.update as Mock).mockReturnValue({ set: updateSet });

    (openai.responses.stream as Mock).mockReturnValue(
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

  type ToolTestCase = {
    toolName: string;
    args: object;
    resultKind: string;
  };
  const toolTestCases: ToolTestCase[] = [
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
    async ({ toolName, args, resultKind }: ToolTestCase) => {
      (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
      const updateWhere = vi.fn();
      const updateSet = vi.fn(() => ({ where: updateWhere }));
      (db.update as Mock).mockReturnValue({ set: updateSet });

      const { executeTool: mockExecuteTool } =
        await import("@/lib/ai/ai_tools");
      (mockExecuteTool as Mock).mockResolvedValueOnce({
        kind: resultKind,
        message: "ok",
      });

      // First call returns tool call stream, second call returns a text completion
      (openai.responses.stream as Mock)
        .mockReturnValueOnce(createToolCallStreamMock(toolName, args))
        .mockReturnValueOnce(createTextStreamMock("Done."));

      const res = await POST(
        mockRequest({ messages: [{ role: "user", content: "Hi" }] })
      );
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
