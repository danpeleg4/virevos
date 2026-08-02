import { headers } from "next/headers";
import type { PortalUploadsDB } from "@db/classes/portal_uploads_db";
import type { StorageClientInterface } from "@/api_client/supabase_storage_client";
import type { PlanLimitsDB } from "@db/classes/plan_limits_db";
import type { BillingDB } from "@db/classes/billing_db";
import { FILES_BUCKET } from "@/lib/supabase/supabase";
import { rateLimitHeaders } from "@/lib/util/rate_limit";
import { assertCanAddFile } from "@/lib/plan_limits";
import {
  MAX_NAME,
  ValidationError,
  requireString,
} from "@/lib/util/validation";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILENAME_LENGTH = 255;
const MAX_MIMETYPE_LENGTH = 100;

export interface UploadPortalFileResult {
  id: number;
  name: string;
  size: number | null;
  mimeType: string | null;
  path: string;
  createdAt: Date | null;
  caseId: number;
}

/**
 * Public, token-authenticated file upload action invoked from the client
 * portal. Validates the portal token, enforces the storage quota, stores the
 * file, and records it against a case for the portal's client.
 */
export async function uploadPortalFile(
  token: string,
  formData: FormData,
  portalUploadsDb: PortalUploadsDB,
  storage: StorageClientInterface,
  planLimitsDb: PlanLimitsDB,
  billingDb: BillingDB
): Promise<UploadPortalFileResult> {
  const limited = rateLimitHeaders(await headers(), {
    keyPrefix: "portal-upload",
    windowMs: 60_000,
    max: 10,
  });
  if (limited) throw new ValidationError("Too many requests", 429);

  const tokenValue = requireString(token, "token", MAX_NAME);

  // Validate token
  const tokenRows = await portalUploadsDb.getPortalTokenByToken(tokenValue);

  if (!tokenRows.length || !tokenRows[0].enabled) {
    throw new ValidationError("Portal not found or disabled", 404);
  }

  const portalToken = tokenRows[0];
  const settings = portalToken.settings as {
    fileSharing?: boolean;
  } | null;

  // Respect fileSharing setting (default enabled)
  if (settings?.fileSharing === false) {
    throw new ValidationError(
      "File sharing is not enabled for this portal",
      403
    );
  }

  const userId = portalToken.userId;

  // Fetch client
  const clientRows = await portalUploadsDb.getClientById(portalToken.clientId);

  if (!clientRows.length) {
    throw new ValidationError("Client not found", 404);
  }

  // Parse form data
  const file = formData.get("file") as File | null;
  const caseIdRaw = formData.get("caseId");

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

  await assertCanAddFile(userId, file.size, planLimitsDb, billingDb);

  // Resolve caseId
  let caseId: number;

  if (caseIdRaw) {
    const parsedId = parseInt(String(caseIdRaw), 10);
    if (isNaN(parsedId)) {
      throw new ValidationError("Invalid caseId", 400);
    }
    // Verify the case belongs to this client
    const caseRows = await portalUploadsDb.getCaseForClient(
      parsedId,
      portalToken.clientId
    );

    if (!caseRows.length) {
      throw new ValidationError(
        "Case not found or does not belong to this client",
        403
      );
    }
    caseId = parsedId;
  } else {
    // Use first case for this client
    const clientCases = await portalUploadsDb.getFirstCaseForClient(
      portalToken.clientId
    );

    if (!clientCases.length) {
      throw new ValidationError("No cases found for this client", 400);
    }
    caseId = clientCases[0].id;
  }

  // Sanitize filename and build storage path
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const filePath = `cases/${userId}/portal/${Date.now()}-${safeName}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await storage.uploadFile(FILES_BUCKET, filePath, fileBuffer, file.type);

  let inserted;
  try {
    inserted = await portalUploadsDb.insertCaseFileWithStorage({
      caseId,
      userId,
      name: file.name,
      path: filePath,
      size: file.size,
      mimeType: file.type,
    });
  } catch (dbErr) {
    // Best-effort cleanup so we don't leak orphaned files in storage.
    try {
      await storage.deleteFile(FILES_BUCKET, filePath);
    } catch (cleanupErr) {
      console.error("Orphan file cleanup failed:", cleanupErr);
    }
    console.error("[uploadPortalFile]", dbErr);
    throw dbErr;
  }

  return {
    id: inserted.id,
    name: inserted.name,
    size: inserted.size,
    mimeType: inserted.mimeType,
    path: inserted.path,
    createdAt: inserted.createdAt,
    caseId,
  };
}
