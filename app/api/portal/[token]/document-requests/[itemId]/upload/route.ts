import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import {
  clientPortalTokens,
  cases,
  caseFiles,
  meetingDocumentRequests,
  documentRequestItems,
  users,
} from "@db/schema";
import { eq, sql } from "drizzle-orm";
import { uploadFile } from "@/lib/storage";
import { FILES_BUCKET } from "@/lib/supabase/supabase";
import { rateLimit } from "@/lib/util/rate_limit";
import {
  analyzeDocumentRequirement,
  type DocumentAnalysisResult,
} from "@/lib/ai/document_analysis";
import { assertCanUseAI } from "@/lib/plan_limits";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILENAME_LENGTH = 255;
const MAX_MIMETYPE_LENGTH = 100;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; itemId: string }> }
) {
  const limited = rateLimit(req, {
    keyPrefix: "portal-doc-upload",
    windowMs: 60_000,
    max: 10,
  });
  if (limited) return limited;

  try {
    const { token, itemId: itemIdRaw } = await params;
    const itemId = parseInt(itemIdRaw, 10);
    if (isNaN(itemId)) {
      return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
    }

    // Validate token
    const tokenRows = await db
      .select()
      .from(clientPortalTokens)
      .where(eq(clientPortalTokens.token, token))
      .limit(1);

    if (!tokenRows.length || !tokenRows[0].enabled) {
      return NextResponse.json(
        { error: "Portal not found or disabled" },
        { status: 404 }
      );
    }

    const portalToken = tokenRows[0];
    const settings = portalToken.settings as {
      fileSharing?: boolean;
    } | null;

    if (settings?.fileSharing === false) {
      return NextResponse.json(
        { error: "File sharing is not enabled for this portal" },
        { status: 403 }
      );
    }

    // Look up the item joined to its parent request
    const itemRows = await db
      .select({
        itemId: documentRequestItems.id,
        itemName: documentRequestItems.name,
        itemDescription: documentRequestItems.description,
        itemStatus: documentRequestItems.status,
        requestId: meetingDocumentRequests.id,
        requestStatus: meetingDocumentRequests.status,
        requestClientId: meetingDocumentRequests.clientId,
      })
      .from(documentRequestItems)
      .innerJoin(
        meetingDocumentRequests,
        eq(documentRequestItems.requestId, meetingDocumentRequests.id)
      )
      .where(eq(documentRequestItems.id, itemId))
      .limit(1);

    if (!itemRows.length) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const item = itemRows[0];

    if (
      item.requestClientId !== portalToken.clientId ||
      item.requestStatus !== "approved"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Allow re-upload when AI previously rejected the file; block only on a
    // human-confirmed "uploaded" state.
    if (item.itemStatus === "uploaded") {
      return NextResponse.json(
        { error: "Item already uploaded" },
        { status: 409 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10 MB limit" },
        { status: 400 }
      );
    }

    if (!file.name || file.name.length > MAX_FILENAME_LENGTH) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    if (file.type && file.type.length > MAX_MIMETYPE_LENGTH) {
      return NextResponse.json({ error: "Invalid mime type" }, { status: 400 });
    }

    // Resolve a target case (first one for this client)
    const clientCases = await db
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.clientId, portalToken.clientId))
      .limit(1);

    if (!clientCases.length) {
      return NextResponse.json(
        { error: "No cases found for this client" },
        { status: 400 }
      );
    }
    const caseId = clientCases[0].id;
    const userId = portalToken.userId;

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filePath = `documents/${userId}/req-${item.requestId}/${Date.now()}-${safeName}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await uploadFile(FILES_BUCKET, filePath, fileBuffer, file.type);

    const [inserted] = await db
      .insert(caseFiles)
      .values({
        caseId,
        userId,
        name: file.name,
        path: filePath,
        size: file.size,
        mimeType: file.type,
      })
      .returning();

    let analysis: DocumentAnalysisResult | null;
    try {
      await assertCanUseAI(userId);
      analysis = await analyzeDocumentRequirement({
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        fileBuffer,
        mimeType: file.type,
        fileName: file.name,
      });
    } catch {
      analysis = null;
    }

    if (analysis && analysis.verdict !== "skipped") {
      await db
        .update(users)
        .set({ ai_credits: sql`${users.ai_credits} + 1` })
        .where(eq(users.user_id, userId));
    }

    const finalStatus =
      analysis?.verdict === "does_not_meet" ? "rejected" : "uploaded";

    await db
      .update(documentRequestItems)
      .set({
        status: finalStatus,
        uploadedFileId: inserted.id,
        uploadedAt: new Date(),
        ...(analysis
          ? {
              aiVerdict: analysis.verdict,
              aiReasoning: analysis.reasoning,
              aiAnalyzedAt: new Date(),
            }
          : {}),
      })
      .where(eq(documentRequestItems.id, itemId));

    return NextResponse.json(
      {
        itemId,
        status: finalStatus,
        ...(analysis ? { analysis } : {}),
        file: {
          id: inserted.id,
          name: inserted.name,
          size: inserted.size,
          mimeType: inserted.mimeType,
          path: inserted.path,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(
      "[api/portal/[token]/document-requests/[itemId]/upload POST]",
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
