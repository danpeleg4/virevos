"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { scheduledEmails } from "@db/schema";
import { and, eq } from "drizzle-orm";
import {
  MAX_HTML_BODY,
  MAX_NAME,
  MAX_SHORT,
  MAX_TITLE,
  ValidationError,
  optionalString,
  requireDateString,
  requireEmail,
  requireInt,
  requireOneOf,
  requireString,
} from "./validation";
import { sanitizeEmailHtml } from "./html_sanitizer";

const RECURRING_OPTIONS = ["none", "daily", "weekly", "monthly"] as const;

export interface ScheduleEmailInput {
  toEmail: string;
  toName?: string | null;
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  scheduledAt: string;
  timezone?: string | null;
  recurring?: string | null;
  clientId?: number | null;
}

export async function createScheduledEmail(input: ScheduleEmailInput) {
  const user = await currentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const toEmail = requireEmail(input.toEmail, "toEmail");
  const toName = optionalString(input.toName, "toName", MAX_NAME) ?? null;
  const subject = requireString(input.subject, "subject", MAX_TITLE);
  const bodyHtml = sanitizeEmailHtml(
    requireString(input.bodyHtml, "bodyHtml", MAX_HTML_BODY)
  );
  const bodyText =
    optionalString(input.bodyText, "bodyText", MAX_HTML_BODY) ?? null;
  const scheduledAt = requireDateString(input.scheduledAt, "scheduledAt");
  const timezone =
    optionalString(input.timezone, "timezone", MAX_SHORT) ?? "UTC";
  const recurring = input.recurring
    ? requireOneOf(input.recurring, "recurring", RECURRING_OPTIONS)
    : "none";
  const clientId =
    input.clientId !== undefined && input.clientId !== null
      ? requireInt(input.clientId, "clientId")
      : null;

  const [inserted] = await db
    .insert(scheduledEmails)
    .values({
      toEmail,
      toName,
      subject,
      bodyHtml,
      bodyText,
      scheduledAt,
      timezone,
      recurring,
      status: "pending",
      clientId,
      userId: user.id,
    })
    .returning();

  return inserted;
}

export async function deleteScheduledEmail(id: number) {
  const user = await currentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericId = requireInt(id, "id");

  const rows = await db
    .select()
    .from(scheduledEmails)
    .where(
      and(
        eq(scheduledEmails.id, numericId),
        eq(scheduledEmails.userId, user.id)
      )
    )
    .limit(1);

  if (!rows.length) {
    throw new ValidationError("Scheduled email not found", 404);
  }

  await db
    .delete(scheduledEmails)
    .where(
      and(
        eq(scheduledEmails.id, numericId),
        eq(scheduledEmails.userId, user.id)
      )
    );

  return { success: true };
}
