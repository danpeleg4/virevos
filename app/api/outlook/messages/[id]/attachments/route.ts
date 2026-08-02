import { NextRequest, NextResponse } from "next/server";
import {
  getOutlookAttachmentContent,
  listOutlookAttachments,
} from "@/lib/outlook/outlook_attachments";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { ValidationError } from "@/lib/util/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/outlook/messages/[id]/attachments
 *  — without ?attachmentId: lists attachment metadata
 *  — with    ?attachmentId: streams the raw bytes for that attachment
 *    (attachment IDs contain base64 chars like +/= so they must be a query
 *     param rather than a URL path segment)
 **/
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const attachmentId = req.nextUrl.searchParams.get("attachmentId");

  try {
    if (attachmentId) {
      const { bytes, contentType, fileName } =
        await getOutlookAttachmentContent(
          numericId,
          attachmentId,
          outlookDrizzle,
          graphAuthService,
          graphMailService
        );

      const asciiFallback = fileName
        .replace(/[^\x20-\x7E]/g, "_")
        .replace(/["\\]/g, "_");

      return new NextResponse(new Uint8Array(bytes), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    const result = await listOutlookAttachments(
      numericId,
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[outlook/attachments]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch attachment(s)" },
      { status: 500 }
    );
  }
}
