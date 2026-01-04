import 'dotenv/config';
import {convertToModelMessages, stepCountIs, streamText, tool, UIMessage} from 'ai';
import {NextRequest, NextResponse} from "next/server";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";
import { users } from "@/db/schema";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const [res] = await db.select({
        ai_credits: users.ai_credits
    }).from(users).where(eq(users.user_id , user.id));
    if (res.ai_credits){
        await db.update(users).set({ai_credits: res.ai_credits - 1}).where(eq(users.user_id , user.id));
    }

    const result = streamText({
        model: "openai/gpt-5.2-chat",
        stopWhen: stepCountIs(5),
        messages: await convertToModelMessages(messages),
        tools: {
            weather: tool({
                description: 'Get the weather in a location (fahrenheit)',
                inputSchema: z.object({
                    location: z.string().describe('The location to get the weather for'),
                }),
                execute: async ({ location }) => {
                    const temperature = Math.round(Math.random() * (90 - 32) + 32);
                    return {
                        location,
                        temperature,
                    };
                },
            }),
            convertFahrenheitToCelsius: tool({
                description: 'Convert a temperature in fahrenheit to celsius',
                inputSchema: z.object({
                    temperature: z
                        .number()
                        .describe('The temperature in fahrenheit to convert'),
                }),
                execute: async ({ temperature }) => {
                    const celsius = Math.round((temperature - 32) * (5 / 9));
                    return {
                        celsius,
                    };
                },
            }),
        },
    });

    return result.toUIMessageStreamResponse();
}