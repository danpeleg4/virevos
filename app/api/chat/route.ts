import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { users } from "@db/schema";
import { db } from "@db/db";
import { eq, sql } from "drizzle-orm";
import OpenAI from "openai";
import { openai, tools, executeTool, MODEL, MAX_STEPS } from "@/lib/ai_tools";
import type { ChatMessage, StreamEvent } from "@/types/ai";
import { assertCanUseAI } from "@/lib/plan_limits";
import {
  MAX_CHAT_HISTORY,
  MAX_HTML_BODY,
  MAX_SHORT,
} from "@/lib/validation";

const SYSTEM_INSTRUCTIONS =
  "You are a helpful AI assistant for Virevos, a business management platform. You help users manage clients, tasks, and workflows.";

const VALID_ROLES = new Set(["user", "assistant", "system"]);

function encodeEvent(event: StreamEvent, encoder: TextEncoder): Uint8Array {
  return encoder.encode(JSON.stringify(event) + "\n");
}

function validateChatPayload(raw: unknown): {
  messages: ChatMessage[];
  previousResponseId?: string;
} {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid request body");
  }
  const body = raw as {
    messages?: unknown;
    previousResponseId?: unknown;
  };

  if (!Array.isArray(body.messages)) {
    throw new Error("messages must be an array");
  }
  if (body.messages.length === 0) {
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
  if (body.previousResponseId !== undefined && body.previousResponseId !== null) {
    if (typeof body.previousResponseId !== "string") {
      throw new Error("previousResponseId must be a string");
    }
    if (body.previousResponseId.length > MAX_SHORT) {
      throw new Error(`previousResponseId exceeds max length of ${MAX_SHORT}`);
    }
    previousResponseId = body.previousResponseId;
  }

  return { messages, previousResponseId };
}

export async function POST(req: NextRequest) {
  let messages: ChatMessage[];
  let previousResponseId: string | undefined;
  try {
    const parsed = validateChatPayload(await req.json());
    messages = parsed.messages;
    previousResponseId = parsed.previousResponseId;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }

  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await assertCanUseAI(user.id);
  } catch {
    return NextResponse.json("No AI Credits", { status: 401 });
  }

  await db
    .update(users)
    .set({ ai_credits: sql`${users.ai_credits} + 1` })
    .where(eq(users.user_id, user.id));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encodeEvent(event, encoder));
      };

      let finalResponseId: string | undefined;

      try {
        const initialInput: OpenAI.Responses.ResponseInputItem[] = messages.map(
          (m) => ({ role: m.role, content: m.content })
        );

        const currentInput: OpenAI.Responses.ResponseInputItem[] = initialInput;
        let currentResponseId: string | undefined = previousResponseId;

        for (let step = 0; step < MAX_STEPS; step++) {
          const responseStream = openai.responses.stream({
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

          const toolResults: OpenAI.Responses.ResponseInputItem[] = [];
          for (const call of toolCalls) {
            const output = await executeTool(
              call.name,
              JSON.parse(call.arguments) as Record<string, unknown>
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
