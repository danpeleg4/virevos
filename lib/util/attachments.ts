import type { StorageClientInterface } from "@/api_client/supabase_storage_client";
import { FILES_BUCKET } from "@/lib/supabase/supabase";

// Permissive enough to accept both EmailAttachmentInput (validation-layer
// input, fields optional) and ScheduledEmailAttachment (DB row, fields
// nullable) without either caller needing to cast.
export interface AttachmentLike {
  name: string;
  data?: string | null;
  path?: string | null;
  url?: string | null;
  mimeType?: string | null;
}

export async function resolveAttachmentBuffer(
  att: AttachmentLike,
  storage: StorageClientInterface
): Promise<Buffer | null> {
  if (att.data) return Buffer.from(att.data, "base64");
  if (att.path) {
    const bytes = await storage.downloadFile(FILES_BUCKET, att.path);
    return Buffer.from(bytes);
  }
  return null;
}

export function appendAttachmentLinks(
  html: string,
  urlAttachments: AttachmentLike[]
): string {
  if (urlAttachments.length === 0) return html;
  const links = urlAttachments
    .map((a) => `<a href="${a.url}">${a.name}</a>`)
    .join("<br>");
  return `${html}<br><br>${links}`;
}
