import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  approveDocumentRequest,
  declineDocumentRequest,
  updateDocumentRequest,
} from "@/lib/document_requests";
import { documentRequestsDrizzle } from "@db/document_requests_db";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const requestId = Number(id);
    if (Number.isNaN(requestId)) {
      return NextResponse.json(
        { error: "Invalid request id" },
        { status: 400 }
      );
    }

    const body = await req.json();

    if (body.type === "approve") {
      await approveDocumentRequest(requestId, documentRequestsDrizzle);
      return NextResponse.json({ success: true });
    }

    if (body.type === "decline") {
      await declineDocumentRequest(requestId, documentRequestsDrizzle);
      return NextResponse.json({ success: true });
    }

    if (body.type === "update") {
      await updateDocumentRequest(
        requestId,
        body.data,
        documentRequestsDrizzle
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No type found" }, { status: 400 });
  } catch (err) {
    console.error("[api/document-requests/[id] PATCH]", err);
    const message = err instanceof Error ? err.message : "Update failed";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
