import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import type OpenAI from "openai";
import {
  tools,
  executeTool,
  MODEL,
  MAX_STEPS,
  type AiToolDeps,
} from "@/lib/ai/ai_tools";
import type {
  ChatMessage,
  StreamEvent,
  AIFormRequest,
  AIFormField,
} from "@/types/ai";
import { assertCanUseAI } from "@/lib/plan_limits";
import { planLimitsDrizzle } from "@db/plan_limits_db";
import { billingDrizzle } from "@db/billing_db";
import { clientsDrizzle } from "@db/clients_db";
import { casesDrizzle } from "@db/cases_db";
import { tasksDrizzle } from "@db/tasks_db";
import { calendarDrizzle } from "@db/calendar_db";
import { meetingsDrizzle } from "@db/meetings_db";
import { emailsDrizzle } from "@db/emails_db";
import { outlookDrizzle } from "@db/outlook_db";
import { openAIClient } from "@/api_client/openai_client";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { graphCalendarService } from "@/api_client/ms_graph/graph_calendar_service";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import {
  MAX_CHAT_HISTORY,
  MAX_HTML_BODY,
  MAX_SHORT,
} from "@/lib/util/validation";
import { rateLimit } from "@/lib/util/rate_limit";

const aiToolDeps: AiToolDeps = {
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

const SYSTEM_INSTRUCTIONS =
  "You are a helpful AI assistant for Virevos, a business management platform. You help users manage clients, tasks, and workflows. " +
  "When you need additional structured details from the user before performing an action (for example creating a case, client, task, or event) and the user has not already provided them, call the requestUserInput tool to collect them with a form rather than listing the questions in plain text. requestUserInput must be the only tool call in that turn; wait for the user's submitted answers before proceeding.";

interface FormResponseInput {
  callId: string;
  values: Record<string, string>;
}

const MAX_FORM_FIELDS = 50;

const VALID_ROLES = new Set(["user", "assistant", "system"]);

function encodeEvent(event: StreamEvent, encoder: TextEncoder): Uint8Array {
  return encoder.encode(JSON.stringify(event) + "\n");
}

function validateFormResponse(raw: unknown): FormResponseInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("formResponse must be an object");
  }
  const fr = raw as { callId?: unknown; values?: unknown };
  if (typeof fr.callId !== "string" || fr.callId.length === 0) {
    throw new Error("formResponse.callId must be a non-empty string");
  }
  if (fr.callId.length > MAX_SHORT) {
    throw new Error(`formResponse.callId exceeds max length of ${MAX_SHORT}`);
  }
  if (!fr.values || typeof fr.values !== "object" || Array.isArray(fr.values)) {
    throw new Error("formResponse.values must be an object");
  }
  const entries = Object.entries(fr.values);
  if (entries.length > MAX_FORM_FIELDS) {
    throw new Error(`formResponse.values exceeds ${MAX_FORM_FIELDS} fields`);
  }
  const values: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (key.length > MAX_SHORT) {
      throw new Error("formResponse field key too long");
    }
    if (typeof value !== "string") {
      throw new Error("formResponse field values must be strings");
    }
    if (value.length > MAX_HTML_BODY) {
      throw new Error("formResponse field value too long");
    }
    values[key] = value;
  }
  return { callId: fr.callId, values };
}

function validateChatPayload(raw: unknown): {
  messages: ChatMessage[];
  previousResponseId?: string;
  formResponse?: FormResponseInput;
} {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid request body");
  }
  const body = raw as {
    messages?: unknown;
    previousResponseId?: unknown;
    formResponse?: unknown;
  };

  const formResponse =
    body.formResponse !== undefined && body.formResponse !== null
      ? validateFormResponse(body.formResponse)
      : undefined;

  if (!Array.isArray(body.messages)) {
    throw new Error("messages must be an array");
  }
  // A form submission resumes a pending tool call and carries no new message.
  if (body.messages.length === 0 && !formResponse) {
    throw new Error("messages cannot be empty");
  }
  if (body.messages.length > MAX_CHAT_HISTORY) {
    throw new Error(`messages exceeds max history of ${MAX_CHAT_HISTORY}`);
  }

  const messages: ChatMessage[] = body.messages.map((m, i) => {
    if (!m || typeof m !== "object") {
      throw new Error(`messages[${i}] must be an object`);
    }
    const msg = m as { role?: unknown; content?: unknown };
    if (typeof msg.role !== "string" || !VALID_ROLES.has(msg.role)) {
      throw new Error(`messages[${i}].role must be user/assistant/system`);
    }
    if (typeof msg.content !== "string") {
      throw new Error(`messages[${i}].content must be a string`);
    }
    if (msg.content.length > MAX_HTML_BODY) {
      throw new Error(
        `messages[${i}].content exceeds max length of ${MAX_HTML_BODY}`
      );
    }
    return { role: msg.role, content: msg.content } as ChatMessage;
  });

  let previousResponseId: string | undefined;
  if (
    body.previousResponseId !== undefined &&
    body.previousResponseId !== null
  ) {
    if (typeof body.previousResponseId !== "string") {
      throw new Error("previousResponseId must be a string");
    }
    if (body.previousResponseId.length > MAX_SHORT) {
      throw new Error(`previousResponseId exceeds max length of ${MAX_SHORT}`);
    }
    previousResponseId = body.previousResponseId;
  }

  if (formResponse && !previousResponseId) {
    throw new Error("previousResponseId is required when submitting a form");
  }

  return { messages, previousResponseId, formResponse };
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, {
    keyPrefix: "chat",
    windowMs: 60_000,
    max: 20,
  });
  if (limited) return limited;

  let messages: ChatMessage[];
  let previousResponseId: string | undefined;
  let formResponse: FormResponseInput | undefined;
  try {
    const parsed = validateChatPayload(await req.json());
    messages = parsed.messages;
    previousResponseId = parsed.previousResponseId;
    formResponse = parsed.formResponse;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }

  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await assertCanUseAI(user.id, planLimitsDrizzle, billingDrizzle);
  } catch {
    return NextResponse.json("No AI Credits", { status: 401 });
  }

  // Update AI credits
  await planLimitsDrizzle.incrementAiCredits(user.id);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encodeEvent(event, encoder));
      };

      let finalResponseId: string | undefined;

      try {
        // A form submission resumes the model's pending requestUserInput call
        // by feeding the answers back as that call's output. Otherwise we send
        // the chat messages as normal.
        const initialInput: OpenAI.Responses.ResponseInputItem[] = formResponse
          ? [
              {
                type: "function_call_output",
                call_id: formResponse.callId,
                output: JSON.stringify(formResponse.values),
              },
            ]
          : messages.map((m) => ({ role: m.role, content: m.content }));

        const currentInput: OpenAI.Responses.ResponseInputItem[] = initialInput;
        let currentResponseId: string | undefined = previousResponseId;

        for (let step = 0; step < MAX_STEPS; step++) {
          const responseStream = openAIClient.streamResponse({
            model: MODEL,
            instructions: SYSTEM_INSTRUCTIONS,
            input: currentInput,
            ...(currentResponseId && {
              previous_response_id: currentResponseId,
            }),
            tools,
          });

          for await (const event of responseStream) {
            if (event.type === "response.output_text.delta") {
              send({ type: "text_delta", delta: event.delta });
            }
          }

          const finalResponse = await responseStream.finalResponse();
          finalResponseId = finalResponse.id;
          currentResponseId = finalResponse.id;

          const toolCalls = finalResponse.output.filter(
            (o) => o.type === "function_call"
          );

          if (toolCalls.length === 0) break;

          // If the model wants more context, stream the form spec and pause the
          // agent loop. The pending call is resumed on the next request once the
          // user submits the form (see initialInput / formResponse above).
          const inputCall = toolCalls.find(
            (c) => c.name === "requestUserInput"
          );
          if (inputCall) {
            let form: AIFormRequest;
            try {
              const parsed = JSON.parse(inputCall.arguments) as {
                title?: unknown;
                fields?: unknown;
              };
              form = {
                callId: inputCall.call_id,
                title: typeof parsed.title === "string" ? parsed.title : "",
                fields: Array.isArray(parsed.fields)
                  ? (parsed.fields as AIFormField[])
                  : [],
              };
            } catch {
              form = { callId: inputCall.call_id, title: "", fields: [] };
            }
            send({ type: "form_request", id: inputCall.call_id, form });
            break;
          }

          const toolResults: OpenAI.Responses.ResponseInputItem[] = [];
          for (const call of toolCalls) {
            const output = await executeTool(
              call.name,
              JSON.parse(call.arguments) as Record<string, unknown>,
              aiToolDeps
            );
            send({
              type: "tool_result",
              id: call.call_id,
              name: call.name,
              result: output,
            });
            toolResults.push({
              type: "function_call_output",
              call_id: call.call_id,
              output: JSON.stringify(output),
            });
          }
          currentInput.push(...toolResults);
        }
      } catch (err) {
        console.error("[api/chat] stream error:", err);
        send({ type: "error", message: "An error occurred" });
      } finally {
        send({ type: "done", response_id: finalResponseId });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
