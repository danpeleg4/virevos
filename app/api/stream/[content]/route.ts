import { currentUser } from "@clerk/nextjs/server";
import OpenAI from "openai";
import {NextRequest} from "next/server";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ content: string }> }
) {
    const user = await currentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const { content } = await ctx.params;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Example: simulate a real LLM streaming response
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: content }],
                    stream: true,
                });

                for await (const chunk of completion) {
                    // chunk.delta contains the new text from OpenAI
                    if (chunk.choices?.[0]?.delta?.content) {
                        const text = chunk.choices[0].delta.content;
                        controller.enqueue(encoder.encode(`data: ${text}\n\n`));
                    }
                }
                controller.close();
            } catch (err) {
                controller.enqueue(encoder.encode(`data: [error]\n\n`));
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        },
    });
}
