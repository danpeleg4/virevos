import { headers } from "next/headers";
import type { PortalUploadsDB } from "@db/classes/portal_uploads_db";
import type { StorageClientInterface } from "@/api_client/supabase_storage_client";
import type { OpenAIClientInterface } from "@/api_client/openai_client";
import type { PlanLimitsDB } from "@db/classes/plan_limits_db";
import type { BillingDB } from "@db/classes/billing_db";
import { FILES_BUCKET } from "@/lib/supabase/supabase";
import { rateLimitHeaders } from "@/lib/util/rate_limit";
import {
  analyzeDocumentRequirement,
  type DocumentAnalysisResult,
} from "@/lib/ai/document_analysis";
import { assertCanUseAI } from "@/lib/plan_limits";
import {
  MAX_NAME,
  ValidationError,
  requireInt,
  requireString,
} from "@/lib/util/validation";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILENAME_LENGTH = 255;
const MAX_MIMETYPE_LENGTH = 100;

export interface UploadDocumentRequestItemResult {
  itemId: number;
  status: "uploaded" | "rejected";
  analysis?: DocumentAnalysisResult;
  file: {
    id: number;
    name: string;
    size: number | null;
    mimeType: string | null;
    path: string;
  };
}

/**
 * Public, token-authenticated upload action invoked from the client portal.
 * Validates the portal token and the target checklist item, stores the file,
 * runs AI document analysis, and updates the item status accordingly.
 */
export async function uploadDocumentRequestItem(
  token: string,
  itemId: number,
  formData: FormData,
  portalUploadsDb: PortalUploadsDB,
  storage: StorageClientInterface,
  openaiClient: OpenAIClientInterface,
  planLimitsDb: PlanLimitsDB,
  billingDb: BillingDB
): Promise<UploadDocumentRequestItemResult> {
  const limited = rateLimitHeaders(await headers(), {
    keyPrefix: "portal-doc-upload",
    windowMs: 60_000,
    max: 10,
  });
  if (limited) throw new ValidationError("Too many requests", 429);

  const tokenValue = requireString(token, "token", MAX_NAME);
  const parsedItemId = requireInt(itemId, "itemId");

  // Validate token
  const tokenRows = await portalUploadsDb.getPortalTokenByToken(tokenValue);

  if (!tokenRows.length || !tokenRows[0].enabled) {
    throw new ValidationError("Portal not found or disabled", 404);
  }

  const portalToken = tokenRows[0];
  const settings = portalToken.settings as {
    fileSharing?: boolean;
  } | null;

  if (settings?.fileSharing === false) {
    throw new ValidationError(
      "File sharing is not enabled for this portal",
      403
    );
  }

  // Look up the item joined to its parent request
  const itemRows =
    await portalUploadsDb.getDocumentRequestItemWithRequest(parsedItemId);

  if (!itemRows.length) {
    throw new ValidationError("Item not found", 404);
  }

  const item = itemRows[0];

  if (
    item.requestClientId !== portalToken.clientId ||
    item.requestStatus !== "approved"
  ) {
    throw new ValidationError("Forbidden", 403);
  }

  // Allow re-upload when AI previously rejected the file; block only on a
  // human-confirmed "uploaded" state.
  if (item.itemStatus === "uploaded") {
    throw new ValidationError("Item already uploaded", 409);
  }

  // Parse form data
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new ValidationError("No file provided", 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError("File exceeds 10 MB limit", 400);
  }

  if (!file.name || file.name.length > MAX_FILENAME_LENGTH) {
    throw new ValidationError("Invalid filename", 400);
  }

  if (file.type && file.type.length > MAX_MIMETYPE_LENGTH) {
    throw new ValidationError("Invalid mime type", 400);
  }

  // Resolve a target case (first one for this client)
  const clientCases = await portalUploadsDb.getFirstCaseForClient(
    portalToken.clientId
  );

  if (!clientCases.length) {
    throw new ValidationError("No cases found for this client", 400);
  }
  const caseId = clientCases[0].id;
  const userId = portalToken.userId;

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const filePath = `documents/${userId}/req-${item.requestId}/${Date.now()}-${safeName}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await storage.uploadFile(FILES_BUCKET, filePath, fileBuffer, file.type);

  const inserted = await portalUploadsDb.insertCaseFile({
    caseId,
    userId,
    name: file.name,
    path: filePath,
    size: file.size,
    mimeType: file.type,
  });

  let analysis: DocumentAnalysisResult | null;
  try {
    await assertCanUseAI(userId, planLimitsDb, billingDb);
    analysis = await analyzeDocumentRequirement(
      {
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        fileBuffer,
        mimeType: file.type,
        fileName: file.name,
      },
      openaiClient
    );
  } catch {
    analysis = null;
  }

  if (analysis && analysis.verdict !== "skipped") {
    await portalUploadsDb.incrementAiCredits(userId);
  }

  const finalStatus =
    analysis?.verdict === "does_not_meet" ? "rejected" : "uploaded";

  await portalUploadsDb.updateDocumentRequestItem(parsedItemId, {
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
  });

  return {
    itemId: parsedItemId,
    status: finalStatus,
    ...(analysis ? { analysis } : {}),
    file: {
      id: inserted.id,
      name: inserted.name,
      size: inserted.size,
      mimeType: inserted.mimeType,
      path: inserted.path,
    },
  };
}
