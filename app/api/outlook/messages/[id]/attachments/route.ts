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

interface GraphFileAttachment {
  name: string;
  contentType: string;
  contentBytes: string; // base64
}

async function resolveEmail(numericId: number, userId: string) {
  const [email] = await db
    .select({ outlookId: outlookEmails.outlookId })
    .from(outlookEmails)
    .where(and(eq(outlookEmails.id, numericId), eq(outlookEmails.userId, userId)))
    .limit(1);
  return email ?? null;
}

/** GET /api/outlook/messages/[id]/attachments
 *  — lists attachment metadata
 *
 *  GET /api/outlook/messages/[id]/attachments?download=<attachmentId>
 *  — proxies the file bytes for download (attachment ID passed as query param
 *    to avoid URL-path issues with base64 characters like / and +)
 */
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
    return NextResponse.json({ error: "Outlook account not connected" }, { status: 403 });
  }

  const attachmentId = req.nextUrl.searchParams.get("download");

  // ── Download mode ────────────────────────────────────────────────────────────
  if (attachmentId) {
    try {
      const res = await axios.get<GraphFileAttachment>(
        `${GRAPH_BASE}/me/messages/${email.outlookId}/attachments/${attachmentId}?$select=name,contentType,contentBytes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { name, contentType, contentBytes } = res.data;
      const buffer = Buffer.from(contentBytes, "base64");

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType ?? "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
          "Content-Length": String(buffer.byteLength),
        },
      });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status ?? 500;
      console.error("[outlook/attachments download]", err);
      return NextResponse.json({ error: "Failed to download attachment" }, { status });
    }
  }

  // ── List mode ────────────────────────────────────────────────────────────────
  try {
    const res = await axios.get<{ value: OutlookAttachmentMeta[] }>(
      `${GRAPH_BASE}/me/messages/${email.outlookId}/attachments?$select=id,name,size,contentType`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return NextResponse.json({ attachments: res.data.value });
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } }).response?.status ?? 500;
    console.error("[outlook/attachments list]", err);
    return NextResponse.json({ error: "Failed to fetch attachments" }, { status });
  }
}
