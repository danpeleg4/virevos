import { NextResponse } from "next/server";
import { listFulfilledRequestsForAgency } from "@/lib/document_requests";

export async function GET() {
  try {
    const requests = await listFulfilledRequestsForAgency();
    return NextResponse.json(requests);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/document-requests/fulfilled GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
