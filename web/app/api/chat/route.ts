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
  const {
    messages,
    previousResponseId,
  }: { messages: ChatMessage[]; previousResponseId?: string } =
    await req.json();

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
