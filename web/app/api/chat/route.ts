import {
  convertToModelMessages,
  FlexibleSchema,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";
import { users } from "@db/schema";
import { db } from "@db/db";
import { eq } from "drizzle-orm";
import { CreateClientInput } from "@/types/clients";
import { addAClient } from "@/lib/server_actions/clients";
import { getPastMeetingTranscript } from "@/lib/server_actions/meetings";
import {aiToolCall} from "@/lib/ai_tools";

export async function POST(req: NextRequest) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [res] = await db
    .select({
      ai_credits: users.ai_credits,
    })
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

  const result = await aiToolCall(user.id, messages);
  return result
}
