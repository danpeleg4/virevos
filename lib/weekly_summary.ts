import { db } from "@db/db";
import {
  users,
  clients,
  cases,
  caseNotes,
  caseFiles,
  tasks,
  events,
  outlookEmails,
  scheduledEmails,
  portalMessages,
  portalMeetingBookings,
  meetingDocumentRequests,
} from "@db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { supabaseAdmin } from "@/lib/supabase/supabase";
import {
  EMAILS_BUCKET,
  EMAILS_INDEX,
  TRANSCRIPT_BUCKET,
  TRANSCRIPT_INDEX,
  EMBEDDING_DIMENSION,
} from "./embeddings";
import { openai, MODEL } from "./ai/ai_tools";
import { sendEmail } from "./resend";

const VECTOR_TOP_K = 50;
const VECTOR_SAMPLE_PROMPT = 8;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const AI_TIMEOUT_MS = 60_000;
const VECTOR_TIMEOUT_MS = 10_000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
}

export interface WeeklyData {
  rangeStart: Date;
  rangeEnd: Date;
  clientsCreated: number;
  casesCreated: number;
  caseNotesCreated: number;
  caseFilesUploaded: number;
  tasksCreated: number;
  tasksCompleted: number;
  meetingsHeld: number;
  emailsSent: number;
  emailsReceived: number;
  scheduledEmailsSent: number;
  portalMessages: number;
  portalBookings: number;
  documentRequests: number;
  tasks: Array<{ title: string; status: string; priority: string }>;
  cases: Array<{ name: string; status: string; priority: string }>;
  meetings: Array<{
    title: string;
    dateTime: string;
    aiSummary: string | null;
  }>;
  clients: Array<{ name: string; email: string | null }>;
  transcriptSnippets: string[];
  emailSnippets: Array<{
    subject: string;
    from: string | null;
    direction: "sent" | "received";
  }>;
}

interface TranscriptMeta {
  user_id?: string;
  chunk_text?: string;
  started_epoch?: number | string;
}

interface EmailVectorMeta {
  user_id?: string;
  subject?: string;
  from_email?: string;
  sent_at?: string;
  is_sent?: boolean;
}

function toEpoch(value: number | string | undefined): number | null {
  if (value === undefined) return null;
  if (typeof value === "number") {
    return value < 1e12 ? value * 1000 : value;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function queryUserVectors<T>(
  bucket: string,
  indexName: string,
  userId: string
): Promise<Array<{ metadata: T }>> {
  try {
    const index = supabaseAdmin.storage.vectors.from(bucket).index(indexName);
    // The vector store doesn't support range filters on metadata, so we pull a
    // wide TopK for this user and post-filter by timestamp below. A zero vector
    // works as a neutral query that surfaces an arbitrary slice — fine for a
    // weekly digest where we just want a representative sample.
    const zero = new Array<number>(EMBEDDING_DIMENSION).fill(0);
    const { data, error } = await withTimeout(
      index.queryVectors({
        queryVector: { float32: zero },
        topK: VECTOR_TOP_K,
        filter: { user_id: userId },
        returnMetadata: true,
      }),
      VECTOR_TIMEOUT_MS,
      `queryVectors(${bucket})`
    );
    if (error || !data?.vectors) return [];
    return data.vectors.map((v) => ({ metadata: v.metadata as T }));
  } catch (err) {
    console.warn(
      `[weekly_summary] queryVectors(${bucket}) failed; continuing without vectors:`,
      err
    );
    return [];
  }
}

export async function gatherWeekData(userId: string): Promise<WeeklyData> {
  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd.getTime() - ONE_WEEK_MS);

  const [
    clientRows,
    caseRows,
    caseNoteRows,
    caseFileRows,
    taskRows,
    eventRows,
    outlookEmailRows,
    scheduledRows,
    portalMsgRows,
    portalBookingRows,
    docReqRows,
  ] = await Promise.all([
    db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .where(
        and(eq(clients.userId, userId), gte(clients.createdAt, rangeStart))
      ),
    db
      .select({
        id: cases.id,
        name: cases.name,
        status: cases.status,
        priority: cases.priority,
        createdAt: cases.createdAt,
      })
      .from(cases)
      .where(and(eq(cases.userId, userId), gte(cases.createdAt, rangeStart))),
    db
      .select({ id: caseNotes.id })
      .from(caseNotes)
      .where(
        and(eq(caseNotes.userId, userId), gte(caseNotes.createdAt, rangeStart))
      ),
    db
      .select({ id: caseFiles.id })
      .from(caseFiles)
      .where(
        and(eq(caseFiles.userId, userId), gte(caseFiles.createdAt, rangeStart))
      ),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        completed: tasks.completed,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), gte(tasks.createdAt, rangeStart))),
    db
      .select({
        id: events.id,
        title: events.title,
        dateTime: events.dateTime,
        aiSummary: events.aiSummary,
        isMeeting: events.isMeeting,
      })
      .from(events)
      .where(and(eq(events.userId, userId), gte(events.createdAt, rangeStart))),
    db
      .select({
        id: outlookEmails.id,
        isSent: outlookEmails.isSent,
        createdAt: outlookEmails.createdAt,
      })
      .from(outlookEmails)
      .where(
        and(
          eq(outlookEmails.userId, userId),
          gte(outlookEmails.createdAt, rangeStart)
        )
      ),
    db
      .select({ id: scheduledEmails.id, status: scheduledEmails.status })
      .from(scheduledEmails)
      .where(
        and(
          eq(scheduledEmails.userId, userId),
          gte(scheduledEmails.createdAt, rangeStart)
        )
      ),
    db
      .select({ id: portalMessages.id })
      .from(portalMessages)
      .where(
        and(
          eq(portalMessages.userId, userId),
          gte(portalMessages.createdAt, rangeStart)
        )
      ),
    db
      .select({ id: portalMeetingBookings.id })
      .from(portalMeetingBookings)
      .where(
        and(
          eq(portalMeetingBookings.userId, userId),
          gte(portalMeetingBookings.createdAt, rangeStart)
        )
      ),
    db
      .select({ id: meetingDocumentRequests.id })
      .from(meetingDocumentRequests)
      .where(
        and(
          eq(meetingDocumentRequests.userId, userId),
          gte(meetingDocumentRequests.createdAt, rangeStart)
        )
      ),
  ]);

  const completedTaskRows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.status, "completed"),
        gte(tasks.updatedAt, rangeStart)
      )
    );

  const sentScheduled = scheduledRows.filter((r) => r.status === "sent").length;

  const [transcriptVectors, emailVectors] = await Promise.all([
    queryUserVectors<TranscriptMeta>(
      TRANSCRIPT_BUCKET,
      TRANSCRIPT_INDEX,
      userId
    ),
    queryUserVectors<EmailVectorMeta>(EMAILS_BUCKET, EMAILS_INDEX, userId),
  ]);

  const transcriptSnippets: string[] = [];
  for (const hit of transcriptVectors) {
    const epoch = toEpoch(hit.metadata?.started_epoch);
    if (
      epoch !== null &&
      epoch >= rangeStart.getTime() &&
      epoch <= rangeEnd.getTime() &&
      hit.metadata?.chunk_text
    ) {
      transcriptSnippets.push(hit.metadata.chunk_text);
    }
  }

  const emailSnippets: WeeklyData["emailSnippets"] = [];
  for (const hit of emailVectors) {
    const epoch = toEpoch(hit.metadata?.sent_at);
    if (
      epoch !== null &&
      epoch >= rangeStart.getTime() &&
      epoch <= rangeEnd.getTime()
    ) {
      emailSnippets.push({
        subject: hit.metadata?.subject ?? "(no subject)",
        from: hit.metadata?.from_email ?? null,
        direction: hit.metadata?.is_sent ? "sent" : "received",
      });
    }
  }

  return {
    rangeStart,
    rangeEnd,
    clientsCreated: clientRows.length,
    casesCreated: caseRows.length,
    caseNotesCreated: caseNoteRows.length,
    caseFilesUploaded: caseFileRows.length,
    tasksCreated: taskRows.length,
    tasksCompleted: completedTaskRows.length,
    meetingsHeld: eventRows.filter((e) => e.isMeeting).length,
    emailsSent: outlookEmailRows.filter((e) => e.isSent).length,
    emailsReceived: outlookEmailRows.filter((e) => !e.isSent).length,
    scheduledEmailsSent: sentScheduled,
    portalMessages: portalMsgRows.length,
    portalBookings: portalBookingRows.length,
    documentRequests: docReqRows.length,
    tasks: taskRows.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
    })),
    cases: caseRows.map((c) => ({
      name: c.name,
      status: c.status,
      priority: c.priority,
    })),
    meetings: eventRows.map((e) => ({
      title: e.title,
      dateTime: e.dateTime.toISOString(),
      aiSummary: e.aiSummary,
    })),
    clients: clientRows.map((c) => ({ name: c.name, email: c.email })),
    transcriptSnippets: transcriptSnippets.slice(0, VECTOR_SAMPLE_PROMPT),
    emailSnippets: emailSnippets.slice(0, VECTOR_SAMPLE_PROMPT),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fallbackHtml(name: string, data: WeeklyData): string {
  const greeting = name ? escapeHtml(name) : "there";
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
<h1 style="margin:0 0 8px">Your week, ${greeting}</h1>
<p style="color:#666;margin:0 0 24px">${data.rangeStart.toDateString()} – ${data.rangeEnd.toDateString()}</p>
<ul style="line-height:1.7">
<li>${data.tasksCreated} tasks created · ${data.tasksCompleted} completed</li>
<li>${data.meetingsHeld} meetings held</li>
<li>${data.clientsCreated} new clients · ${data.casesCreated} new cases</li>
<li>${data.emailsSent} emails sent · ${data.emailsReceived} received</li>
<li>${data.portalMessages} client portal messages · ${data.portalBookings} bookings</li>
</ul>
</body></html>`;
}

export async function generateSummaryHtml(
  name: string,
  data: WeeklyData
): Promise<string> {
  const prompt = `You are writing a friendly, motivating weekly productivity email for a solo professional named ${name || "the user"}.

Use the data below (covering ${data.rangeStart.toISOString()} to ${data.rangeEnd.toISOString()}) to craft a polished HTML email.

Requirements:
- Output ONLY a complete HTML document (no markdown, no commentary).
- Inline CSS only. Max width 600px. Clean, modern, light theme.
- Open with a warm greeting using the user's first name.
- Include sections: "This week at a glance" (key counts), "Highlights" (notable cases/clients/meetings), "What's next" (open tasks).
- If there's almost no activity, be encouraging — don't fabricate.
- End with a short positive sign-off from "Virevos".

Data:
${JSON.stringify(data, null, 2)}`;

  let res;
  try {
    res = await withTimeout(
      openai.responses.create({ model: MODEL, input: prompt }),
      AI_TIMEOUT_MS,
      "openai.responses.create"
    );
  } catch (err) {
    console.warn(
      "[weekly_summary] AI generation failed; using fallback template:",
      err
    );
    return fallbackHtml(name, data);
  }

  const html = res.output_text?.trim();
  if (!html || !html.toLowerCase().includes("<html")) {
    return fallbackHtml(name, data);
  }
  return html;
}

export async function sendWeeklySummary(
  userId: string
): Promise<{ skipped?: string; emailId?: string }> {
  const [user] = await db
    .select({
      email: users.email,
      name: users.name,
      weeklySummary: users.weeklySummary,
    })
    .from(users)
    .where(eq(users.userId, userId));

  if (!user) return { skipped: "user_not_found" };
  if (!user.weeklySummary) return { skipped: "preference_off" };
  if (!user.email) return { skipped: "no_email" };
  const data = await gatherWeekData(userId);
  const html = await generateSummaryHtml(user.name ?? "", data);
  const { id } = await sendEmail({
    to: user.email,
    subject: "Your weekly productivity summary",
    html,
  });
  await db
    .update(users)
    .set({ aiCredits: sql`${users.aiCredits} + 1` })
    .where(eq(users.userId, userId));
  return { emailId: id };
}

export async function listUsersWithWeeklySummary(): Promise<
  Array<{ userId: string }>
> {
  const rows = await db
    .select({ userId: users.userId })
    .from(users)
    .where(eq(users.weeklySummary, true));
  return rows;
}
