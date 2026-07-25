import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  deletePortalChat,
  getPortalChatThread,
  sendAgencyChatMessage,
  updatePortalChat,
} from "@/lib/portal/portal_chat";
import { portalChatDrizzle } from "@db/portal_chat_db";
import { ValidationError } from "@/lib/util/validation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const clientId = Number(id);
    if (!Number.isFinite(clientId)) {
      return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
    }

    const result = await getPortalChatThread(clientId, portalChatDrizzle);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/portal-chat/[clientId] GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const clientId = Number(id);
    if (!Number.isFinite(clientId)) {
      return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
    }

    const body = await req.json();
    const message = await sendAgencyChatMessage(
      clientId,
      body.message,
      portalChatDrizzle
    );
    return NextResponse.json(message);
  } catch (err) {
    console.error("[api/portal-chat/[clientId] POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const clientId = Number(id);
    if (!Number.isFinite(clientId)) {
      return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
    }

    const body = await req.json();
    const result = await updatePortalChat(
      clientId,
      body.action,
      portalChatDrizzle
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/portal-chat/[clientId] PATCH]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to update chat" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const clientId = Number(id);
    if (!Number.isFinite(clientId)) {
      return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
    }

    const result = await deletePortalChat(clientId, portalChatDrizzle);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/portal-chat/[clientId] DELETE]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
