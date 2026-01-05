import 'dotenv/config';
import { convertToModelMessages, FlexibleSchema, stepCountIs, streamText, tool, UIMessage } from 'ai';
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";
import { users } from "@/db/schema";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { CreateClientInput } from "@/types/clients";
import { addAClient } from "@/lib/server_actions/clients";

export async function POST(req: NextRequest) {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const [res] = await db.select({
        ai_credits: users.ai_credits
    }).from(users).where(eq(users.user_id , user.id));

    if (res.ai_credits > 0){
        await db.update(users).set({ai_credits: res.ai_credits - 1}).where(eq(users.user_id , user.id));
    }

    if (res.ai_credits <= 0){
        return NextResponse.json("No AI Credits", { status: 401 });
    }

    const result = streamText({
        model: "openai/gpt-5.2-chat",
        stopWhen: stepCountIs(5),
        messages: await convertToModelMessages(messages),
        tools: {
            addClient: tool({
                description: 'Create a new client',
                inputSchema: z.object({
                    createClientInput: z.object({
                        name: z.string().describe('The name of the client'),
                        email: z.string().email().describe('The email of the client'),
                        phone: z.string().describe('The phone number of the client'),
                        industry: z.string().describe('The industry of the client'),
                        notes: z.string().optional().describe('notes that can be added to the client'),
                    }),
                }) as FlexibleSchema,
                execute: async ({ createClientInput }: { createClientInput: CreateClientInput }) => {
                    const res = await addAClient(createClientInput)
                    return {
                        client: res,
                        message: "Client created successfully",
                    };
                },
            }),
        },
    });

    return result.toUIMessageStreamResponse();
}