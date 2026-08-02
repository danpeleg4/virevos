import { NextRequest, NextResponse } from "next/server";
import { sendPortalChatMessage } from "@/lib/portal/portal_chat";
import { portalChatDrizzle } from "@db/classes/portal_chat_db";
import { ValidationError } from "@/lib/util/validation";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await ctx.params;
    const body = await req.json();
    const message = await sendPortalChatMessage(
      token,
      body.message,
      portalChatDrizzle
    );
    return NextResponse.json(message);
  } catch (err) {
    console.error("[api/portal/[token]/chat POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
