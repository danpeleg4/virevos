import { getCurrentUser } from "@/lib/supabase/auth";
import { MAX_MESSAGE, requireInt, requireString } from "./util/validation";
import { EMAILS_BUCKET, EMAILS_INDEX, createEmbedding } from "./embeddings";
import type { EmailsDB } from "@db/emails_db";
import type { OpenAIClientInterface } from "@/api_client/openai_client";
import type { StorageClientInterface } from "@/api_client/supabase_storage_client";

interface EmailSearchHit {
  outlookId: string;
  subject: string | null;
  fromEmail: string | null;
  fromName: string | null;
  sentAt: string;
  isSent: boolean;
  snippet: string | null;
}

interface EmailRecentHit extends EmailSearchHit {
  body: string | null;
}

const BODY_PREVIEW_CHARS = 1500;

function htmlToPlain(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildBody(
  bodyText: string | null,
  bodyHtml: string | null
): string | null {
  const text = bodyText ?? (bodyHtml ? htmlToPlain(bodyHtml) : null);
  if (!text) return null;
  return text.length > BODY_PREVIEW_CHARS
    ? text.slice(0, BODY_PREVIEW_CHARS) + "…"
    : text;
}

export async function getEmailData(
  text: string,
  emailsDb: EmailsDB,
  openaiClient: OpenAIClientInterface,
  storage: StorageClientInterface
): Promise<EmailSearchHit[]> {
  const user = await getCurrentUser();
  if (!user?.id) return [];

  const validText = requireString(text, "text", MAX_MESSAGE);
  const queryEmbedding = await createEmbedding(validText, openaiClient);

  const hits = await storage.queryVectors(EMAILS_BUCKET, EMAILS_INDEX, {
    queryVector: { float32: queryEmbedding },
    topK: 10,
    filter: { userId: user.id },
    returnMetadata: true,
  });

  const outlookIds: string[] = [];
  type EmailMeta = {
    outlook_id?: string;
    subject?: string;
    from_email?: string;
    sent_at?: string;
    is_sent?: boolean;
  };
  const metaByOutlookId = new Map<string, EmailMeta>();
  for (const hit of hits) {
    const meta = hit.metadata as EmailMeta | undefined;
    if (meta?.outlook_id) {
      outlookIds.push(meta.outlook_id);
      metaByOutlookId.set(meta.outlook_id, meta);
    }
  }
  if (outlookIds.length === 0) return [];

  const rows = await emailsDb.getEmailsByOutlookIds(user.id, outlookIds);

  const rowByOutlookId = new Map(rows.map((r) => [r.outlookId, r]));

  // Preserve vector-search rank order. Fall back to metadata when the DB row
  // is gone (email deleted but vector still indexed).
  return outlookIds
    .map<EmailSearchHit | null>((id) => {
      const row = rowByOutlookId.get(id);
      if (row) {
        return {
          outlookId: row.outlookId,
          subject: row.subject,
          fromEmail: row.fromEmail,
          fromName: row.fromName,
          sentAt: row.sentAt.toISOString(),
          isSent: !!row.isSent,
          snippet: row.snippet,
        };
      }
      const meta = metaByOutlookId.get(id);
      if (!meta) return null;
      return {
        outlookId: id,
        subject: meta.subject ?? null,
        fromEmail: meta.from_email ?? null,
        fromName: null,
        sentAt: meta.sent_at ?? "",
        isSent: !!meta.is_sent,
        snippet: null,
      };
    })
    .filter((hit): hit is EmailSearchHit => hit !== null);
}

export async function getRecentEmails(
  limit: number,
  emailsDb: EmailsDB
): Promise<EmailRecentHit[]> {
  const user = await getCurrentUser();
  if (!user?.id) return [];

  const raw = requireInt(limit, "limit");
  const cap = Math.max(1, Math.min(25, raw));

  const rows = await emailsDb.getRecentUnsentEmails(user.id, cap);

  return rows.map((r) => ({
    outlookId: r.outlookId,
    subject: r.subject,
    fromEmail: r.fromEmail,
    fromName: r.fromName,
    sentAt: r.sentAt.toISOString(),
    isSent: !!r.isSent,
    snippet: r.snippet,
    body: buildBody(r.bodyText, r.bodyHtml),
  }));
}
