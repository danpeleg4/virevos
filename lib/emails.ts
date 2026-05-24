"use server";

import { db } from "@db/db";
import { outlookEmails } from "@db/schema";
import { getCurrentUser } from "@/lib/supabase/auth";
import { and, desc, eq, inArray } from "drizzle-orm";
import { MAX_MESSAGE, requireInt, requireString } from "./util/validation";
import { EMAILS_BUCKET, EMAILS_INDEX, createEmbedding } from "./embeddings";
import { supabaseAdmin } from "@/lib/supabase/supabase";

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

export async function getEmailData(text: string): Promise<EmailSearchHit[]> {
  const user = await getCurrentUser();
  if (!user?.id) return [];

  const validText = requireString(text, "text", MAX_MESSAGE);
  const queryEmbedding = await createEmbedding(validText);

  const index = supabaseAdmin.storage.vectors
    .from(EMAILS_BUCKET)
    .index(EMAILS_INDEX);

  const { data, error } = await index.queryVectors({
    queryVector: { float32: queryEmbedding },
    topK: 10,
    filter: { user_id: user.id },
    returnMetadata: true,
  });

  if (error) {
    console.error("[getEmailData] queryVectors error:", error);
    return [];
  }

  const outlookIds: string[] = [];
  type EmailMeta = {
    outlook_id?: string;
    subject?: string;
    from_email?: string;
    sent_at?: string;
    is_sent?: boolean;
  };
  const metaByOutlookId = new Map<string, EmailMeta>();
  for (const hit of data?.vectors ?? []) {
    const meta = hit.metadata as EmailMeta | undefined;
    if (meta?.outlook_id) {
      outlookIds.push(meta.outlook_id);
      metaByOutlookId.set(meta.outlook_id, meta);
    }
  }
  if (outlookIds.length === 0) return [];

  const rows = await db
    .select({
      outlookId: outlookEmails.outlookId,
      subject: outlookEmails.subject,
      fromEmail: outlookEmails.fromEmail,
      fromName: outlookEmails.fromName,
      sentAt: outlookEmails.sentAt,
      isSent: outlookEmails.isSent,
      snippet: outlookEmails.snippet,
    })
    .from(outlookEmails)
    .where(
      and(
        eq(outlookEmails.userId, user.id),
        inArray(outlookEmails.outlookId, outlookIds)
      )
    );

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
  limit: number
): Promise<EmailRecentHit[]> {
  const user = await getCurrentUser();
  if (!user?.id) return [];

  const raw = requireInt(limit, "limit");
  const cap = Math.max(1, Math.min(25, raw));

  const rows = await db
    .select({
      outlookId: outlookEmails.outlookId,
      subject: outlookEmails.subject,
      fromEmail: outlookEmails.fromEmail,
      fromName: outlookEmails.fromName,
      sentAt: outlookEmails.sentAt,
      isSent: outlookEmails.isSent,
      snippet: outlookEmails.snippet,
      bodyText: outlookEmails.bodyText,
      bodyHtml: outlookEmails.bodyHtml,
    })
    .from(outlookEmails)
    .where(
      and(eq(outlookEmails.userId, user.id), eq(outlookEmails.isSent, false))
    )
    .orderBy(desc(outlookEmails.sentAt))
    .limit(cap);

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
