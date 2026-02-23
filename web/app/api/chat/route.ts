import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { users } from "@db/schema";
import { db } from "@db/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { openai, tools, executeTool, MODEL, MAX_STEPS } from "@/lib/ai_tools";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type StreamEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_result"; id: string; name: string; result: unknown }
  | { type: "done" }
  | { type: "error"; message: string };

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

  if (res.ai_credits > 0) {
    await db
      .update(users)
      .set({ ai_credits: res.ai_credits - 1 })
      .where(eq(users.user_id, user.id));
  }

  if (res.ai_credits <= 0) {
    return NextResponse.json("No AI Credits", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encodeEvent(event, encoder));
      };

      try {
        const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
          [
            {
              role: "system",
              content:
                "You are a helpful AI assistant for Virevos, a business management platform. You help users manage clients, tasks, and workflows.",
            },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ];

        for (let step = 0; step < MAX_STEPS; step++) {
          const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: openaiMessages,
            tools,
            tool_choice: "auto",
            stream: true,
          });

          let assistantContent = "";
          const toolCalls: Array<{ id: string; name: string; arguments: string }> =
            [];

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              assistantContent += delta.content;
              send({ type: "text_delta", delta: delta.content });
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCalls[idx]) {
                  toolCalls[idx] = { id: "", name: "", arguments: "" };
                }
                if (tc.id) toolCalls[idx].id = tc.id;
                if (tc.function?.name) toolCalls[idx].name = tc.function.name;
                if (tc.function?.arguments)
                  toolCalls[idx].arguments += tc.function.arguments;
              }
            }
          }

          openaiMessages.push({
            role: "assistant",
            content: assistantContent || null,
            tool_calls:
              toolCalls.length > 0
                ? toolCalls.map((tc) => ({
                    id: tc.id,
                    type: "function" as const,
                    function: { name: tc.name, arguments: tc.arguments },
                  }))
                : undefined,
          });

          if (toolCalls.length === 0) break;

          for (const tc of toolCalls) {
            const args = JSON.parse(tc.arguments) as Record<string, unknown>;
            const result = await executeTool(tc.name, args);

            send({ type: "tool_result", id: tc.id, name: tc.name, result });

            openaiMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          }
        }
      } catch {
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
