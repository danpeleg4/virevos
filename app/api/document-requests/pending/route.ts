import { NextResponse } from "next/server";
import { listPendingDocumentRequests } from "@/lib/document_requests";
import { getCurrentUser } from "@/lib/supabase/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const requests = await listPendingDocumentRequests(user.id);
    return NextResponse.json(requests);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/document-requests/pending GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
