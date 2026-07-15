import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  deleteOutlookMessage,
  updateOutlookMessage,
} from "@/lib/outlook/outlook_actions";
import { outlookDrizzle } from "@db/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { ValidationError } from "@/lib/util/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = await outlookDrizzle.getEmailById(numericId, user.id);

  if (!rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const body = await req.json();
    const result = await updateOutlookMessage(
      numericId,
      body.action,
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/outlook/messages/[id] PATCH]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const result = await deleteOutlookMessage(
      numericId,
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/outlook/messages/[id] DELETE]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
