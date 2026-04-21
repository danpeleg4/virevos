import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { outlookEmails } from "@db/schema";
import { and, eq } from "drizzle-orm";
import axios from "axios";
import { getFreshOutlookAccessToken } from "@/lib/outlook_access";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export interface OutlookAttachmentMeta {
  id: string;
  name: string;
  size: number;
  contentType: string;
}

async function resolveEmail(numericId: number, userId: string) {
  const [email] = await db
    .select({ outlookId: outlookEmails.outlookId })
    .from(outlookEmails)
    .where(
      and(eq(outlookEmails.id, numericId), eq(outlookEmails.userId, userId))
    )
    .limit(1);
  return email ?? null;
}

/** GET /api/outlook/messages/[id]/attachments
 *  — lists attachment metadata
 **/
export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const email = await resolveEmail(numericId, user.id);
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = await getFreshOutlookAccessToken(user.id);
  if (!token) {
    return NextResponse.json(
      { error: "Outlook account not connected" },
      { status: 403 }
    );
  }

  // ── List mode ────────────────────────────────────────────────────────────────
  try {
    const res = await axios.get<{ value: OutlookAttachmentMeta[] }>(
      `${GRAPH_BASE}/me/messages/${email.outlookId}/attachments?$select=id,name,size,contentType`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return NextResponse.json({ attachments: res.data.value });
  } catch (err: unknown) {
    const status =
      (err as { response?: { status?: number } }).response?.status ?? 500;
    console.error("[outlook/attachments list]", err);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status }
    );
  }
}
