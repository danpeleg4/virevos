import { POST } from "@/app/api/chat/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { NextRequest } from "next/server";
import { openAIClient } from "@/api_client/openai_client";
import { tools, executeTool } from "@/lib/ai/ai_tools";
import { clientsDrizzle } from "@db/clients_db";
import { casesDrizzle } from "@db/cases_db";
import { tasksDrizzle } from "@db/tasks_db";
import { calendarDrizzle } from "@db/calendar_db";
import { meetingsDrizzle } from "@db/meetings_db";
import { emailsDrizzle } from "@db/emails_db";
import { outlookDrizzle } from "@db/outlook_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { graphCalendarService } from "@/api_client/ms_graph/graph_calendar_service";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { planLimitsDrizzle } from "@db/plan_limits_db";
import { billingDrizzle } from "@db/billing_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/api_client/openai_client", () => ({
  openAIClient: { __sentinel: "openAIClient", streamResponse: vi.fn() },
}));

vi.mock("@/lib/ai/ai_tools", () => ({
  tools: [{ type: "function", name: "addClient" }],
  executeTool: vi.fn(),
  MODEL: "gpt-5",
  MAX_STEPS: 5,
}));

vi.mock("@/lib/plan_limits", () => ({
  assertCanUseAI: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@db/clients_db", () => ({
  clientsDrizzle: { __sentinel: "clientsDrizzle" },
}));
vi.mock("@db/cases_db", () => ({
  casesDrizzle: { __sentinel: "casesDrizzle" },
}));
vi.mock("@db/tasks_db", () => ({
  tasksDrizzle: { __sentinel: "tasksDrizzle" },
}));
vi.mock("@db/calendar_db", () => ({
  calendarDrizzle: { __sentinel: "calendarDrizzle" },
}));
vi.mock("@db/meetings_db", () => ({
  meetingsDrizzle: { __sentinel: "meetingsDrizzle" },
}));
vi.mock("@db/emails_db", () => ({
  emailsDrizzle: { __sentinel: "emailsDrizzle" },
}));
vi.mock("@db/outlook_db", () => ({
  outlookDrizzle: { __sentinel: "outlookDrizzle" },
}));
vi.mock("@db/plan_limits_db", () => ({
  planLimitsDrizzle: {
    __sentinel: "planLimitsDrizzle",
    incrementAiCredits: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("@db/billing_db", () => ({
  billingDrizzle: { __sentinel: "billingDrizzle" },
}));
vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));
vi.mock("@/api_client/ms_graph/graph_calendar_service", () => ({
  graphCalendarService: { __sentinel: "graphCalendarService" },
}));
vi.mock("@/api_client/ms_graph/graph_auth_service", () => ({
  graphAuthService: { __sentinel: "graphAuthService" },
}));

const expectedDeps = {
  clientsDb: clientsDrizzle,
  casesDb: casesDrizzle,
  tasksDb: tasksDrizzle,
  calendarDb: calendarDrizzle,
  meetingsDb: meetingsDrizzle,
  emailsDb: emailsDrizzle,
  planLimitsDb: planLimitsDrizzle,
  billingDb: billingDrizzle,
  outlookDb: outlookDrizzle,
  openaiClient: openAIClient,
  storage: supabaseStorageClient,
  graphCalendar: graphCalendarService,
  graphAuthService: graphAuthService,
};

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

  it("increments AI credits and streams a response via the wired openAIClient", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    (openAIClient.streamResponse as Mock).mockReturnValue(
      createTextStreamMock("Hello!")
    );

    const res = await POST(
      mockRequest({ messages: [{ role: "user", content: "Hi" }] })
    );

    expect(planLimitsDrizzle.incrementAiCredits).toHaveBeenCalledWith("user_1");
    expect(openAIClient.streamResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5",
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

    (openAIClient.streamResponse as Mock).mockReturnValue(
      createTextStreamMock("Follow-up response.", "resp_2")
    );

    const res = await POST(
      mockRequest({
        messages: [{ role: "user", content: "Follow up" }],
        previousResponseId: "resp_1",
      })
    );

    expect(openAIClient.streamResponse).toHaveBeenCalledWith(
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
      toolName: "addClient",
      args: { name: "Test Client" },
      resultKind: "clients_updated",
    },
    {
      toolName: "updateClient",
      args: { id: 1, name: "Updated" },
      resultKind: "client_updated",
    },
    {
      toolName: "createCase",
      args: { name: "Test Case" },
      resultKind: "case_created",
    },
    {
      toolName: "updateCase",
      args: { id: 1, status: "completed" },
      resultKind: "case_updated",
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
    "executes $toolName through the wired AiToolDeps and streams a tool_result event",
    async ({ toolName, args, resultKind }: ToolTestCase) => {
      (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

      (executeTool as Mock).mockResolvedValueOnce({
        kind: resultKind,
        message: "ok",
      });

      // First call returns tool call stream, second call returns a text completion
      (openAIClient.streamResponse as Mock)
        .mockReturnValueOnce(createToolCallStreamMock(toolName, args))
        .mockReturnValueOnce(createTextStreamMock("Done."));

      const res = await POST(
        mockRequest({ messages: [{ role: "user", content: "Hi" }] })
      );
      expect(res.status).toBe(200);

      const text = await res.text();
      const lines = text.trim().split("\n").filter(Boolean);
      const events = lines.map((l) => JSON.parse(l));

      expect(executeTool).toHaveBeenCalledWith(toolName, args, expectedDeps);
      expect(events).toContainEqual(
        expect.objectContaining({ type: "tool_result", name: toolName })
      );
      expect(events.at(-1)).toMatchObject({ type: "done" });
    }
  );

  it("streams a form_request and pauses without executing a tool when requestUserInput is called", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    (openAIClient.streamResponse as Mock).mockReturnValueOnce(
      createToolCallStreamMock("requestUserInput", {
        title: "Set up your new case",
        fields: [
          {
            name: "caseName",
            label: "Case name",
            type: "text",
            required: true,
            options: [],
            placeholder: null,
          },
        ],
      })
    );

    const res = await POST(
      mockRequest({ messages: [{ role: "user", content: "make a case" }] })
    );
    expect(res.status).toBe(200);

    const events = (await res.text())
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    const formEvent = events.find((e) => e.type === "form_request");
    expect(formEvent).toBeTruthy();
    expect(formEvent.form).toMatchObject({
      callId: "call_1",
      title: "Set up your new case",
    });
    expect(formEvent.form.fields[0]).toMatchObject({
      name: "caseName",
      label: "Case name",
    });
    // The pending call is NOT executed, and the loop pauses (single stream call).
    expect(executeTool).not.toHaveBeenCalled();
    expect(openAIClient.streamResponse).toHaveBeenCalledTimes(1);
    expect(events.at(-1)).toMatchObject({ type: "done" });
  });

  it("resumes a pending tool call by feeding form answers back as function_call_output", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    (openAIClient.streamResponse as Mock).mockReturnValue(
      createTextStreamMock("Created!", "resp_3")
    );

    const res = await POST({
      json: vi.fn().mockResolvedValue({
        messages: [],
        previousResponseId: "resp_1",
        formResponse: { callId: "call_1", values: { caseName: "Smith H-1B" } },
      }),
    } as unknown as NextRequest);

    expect(res.status).toBe(200);
    expect(openAIClient.streamResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        previous_response_id: "resp_1",
        input: expect.arrayContaining([
          expect.objectContaining({
            type: "function_call_output",
            call_id: "call_1",
            output: JSON.stringify({ caseName: "Smith H-1B" }),
          }),
        ]),
      })
    );

    const events = (await res.text())
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    expect(events.at(-1)).toMatchObject({
      type: "done",
      response_id: "resp_3",
    });
  });

  it("rejects a form submission that has no previousResponseId", async () => {
    const res = await POST({
      json: vi.fn().mockResolvedValue({
        messages: [],
        formResponse: { callId: "call_1", values: { caseName: "X" } },
      }),
    } as unknown as NextRequest);

    expect(res.status).toBe(400);
  });
});
