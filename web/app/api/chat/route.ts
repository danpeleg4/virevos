import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { users } from "@db/schema";
import { db } from "@db/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { openai, tools, executeTool, MODEL, MAX_STEPS } from "@/lib/ai_tools";
import type { ChatMessage, StreamEvent } from "@/types/ai";

const SYSTEM_INSTRUCTIONS =
  "You are a helpful AI assistant for Virevos, a business management platform. You help users manage clients, tasks, and workflows.";

function encodeEvent(event: StreamEvent, encoder: TextEncoder): Uint8Array {
  return encoder.encode(JSON.stringify(event) + "\n");
}

export async function POST(req: NextRequest) {
  const { messages }: { messages: ChatMessage[] } = await req.json();

  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [res] = await db
    .select({ ai_credits: users.ai_credits })
    .from(users)
    .where(eq(users.user_id, user.id));

  if (!res || res.ai_credits <= 0) {
    return NextResponse.json("No AI Credits", { status: 401 });
  }

  await db
    .update(users)
    .set({ ai_credits: res.ai_credits - 1 })
    .where(eq(users.user_id, user.id));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encodeEvent(event, encoder));
      };

      try {
        const initialInput: OpenAI.Responses.ResponseInputItem[] = messages.map(
          (m) => ({ role: m.role, content: m.content })
        );

        let currentInput: OpenAI.Responses.ResponseInputItem[] = initialInput;
        let previousResponseId: string | undefined;

        for (let step = 0; step < MAX_STEPS; step++) {
          const responseStream = openai.responses.stream({
            model: MODEL,
            instructions: SYSTEM_INSTRUCTIONS,
            input: currentInput,
            ...(previousResponseId && {
              previous_response_id: previousResponseId,
            }),
            tools,
          });

          for await (const event of responseStream) {
            if (event.type === "response.output_text.delta") {
              send({ type: "text_delta", delta: event.delta });
            }
          }

          const response = await responseStream.finalResponse();
          previousResponseId = response.id;

          const functionCalls = response.output.filter(
            (item) => item.type === "function_call"
          );

          if (functionCalls.length === 0) break;

          currentInput = [];
          for (const fc of functionCalls) {
            const args = JSON.parse(fc.arguments) as Record<string, unknown>;
            const result = await executeTool(fc.name, args);

            send({
              type: "tool_result",
              id: fc.call_id,
              name: fc.name,
              result,
            });

            currentInput.push({
              type: "function_call_output",
              call_id: fc.call_id,
              output: JSON.stringify(result),
            });
          }
        }
      } catch (err) {
        console.error("[api/chat] stream error:", err);
        send({ type: "error", message: "An error occurred" });
      } finally {
        send({ type: "done" });
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
