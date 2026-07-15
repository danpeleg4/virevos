import { getCurrentUser } from "@/lib/supabase/auth";
import type { OutlookDB } from "@db/outlook_db";
import type { GraphAuthServiceInterface } from "@/api_client/ms_graph/graph_auth_service";
import type { GraphMailServiceInterface } from "@/api_client/ms_graph/graph_mail_service";
import { getFreshOutlookAccessToken } from "@/lib/outlook/outlook_access";
import { ValidationError } from "@/lib/util/validation";

export interface OutlookAttachmentMeta {
  id: string;
  name: string;
  size: number;
  contentType: string;
}

interface GraphFileAttachment {
  contentBytes: string;
  contentType: string;
  name: string;
}

async function resolveOutlookIdForMessage(
  numericId: number,
  userId: string,
  outlookDb: OutlookDB
): Promise<string> {
  const [email] = await outlookDb.getEmailById(numericId, userId);
  if (!email) throw new ValidationError("Not found", 404);
  return email.outlookId;
}

async function resolveToken(
  userId: string,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface
): Promise<string> {
  const token = await getFreshOutlookAccessToken(
    userId,
    outlookDb,
    graphAuthService
  );
  if (!token) {
    throw new ValidationError("Outlook account not connected", 403);
  }
  return token;
}

export async function listOutlookAttachments(
  emailId: number,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface,
  graphMailService: GraphMailServiceInterface
): Promise<{ attachments: OutlookAttachmentMeta[] }> {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const outlookId = await resolveOutlookIdForMessage(
    emailId,
    user.id,
    outlookDb
  );
  const token = await resolveToken(user.id, outlookDb, graphAuthService);

  const { value } =
    await graphMailService.listAttachments<OutlookAttachmentMeta>(
      token,
      outlookId
    );
  return { attachments: value };
}

export interface OutlookAttachmentContent {
  bytes: Buffer;
  contentType: string;
  fileName: string;
}

export async function getOutlookAttachmentContent(
  emailId: number,
  attachmentId: string,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface,
  graphMailService: GraphMailServiceInterface
): Promise<OutlookAttachmentContent> {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const outlookId = await resolveOutlookIdForMessage(
    emailId,
    user.id,
    outlookDb
  );
  const token = await resolveToken(user.id, outlookDb, graphAuthService);

  const data = await graphMailService.getAttachmentContent<GraphFileAttachment>(
    token,
    outlookId,
    attachmentId
  );

  return {
    bytes: Buffer.from(data.contentBytes, "base64"),
    contentType: data.contentType,
    fileName: data.name,
  };
}
