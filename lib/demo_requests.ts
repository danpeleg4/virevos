import { headers } from "next/headers";
import type { DemoRequestsDB } from "@db/demo_requests_db";
import type { ResendClientInterface } from "@/api_client/resend_client";
import {
  MAX_MESSAGE,
  MAX_NAME,
  ValidationError,
  optionalString,
  requireEmail,
  requireString,
} from "@/lib/util/validation";
import { rateLimitHeaders } from "@/lib/util/rate_limit";

const TEAM_NOTIFICATION_EMAIL = "business@virevos.com";

export interface DemoRequestInput {
  name: string;
  email: string;
  company?: string;
  message?: string;
  /** Hidden honeypot field; real users leave it empty. */
  honeypot?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildNotificationHtml(input: {
  name: string;
  email: string;
  company?: string;
  message?: string;
}): string {
  return `
    <h2>New demo request</h2>
    <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
    <p><strong>Company:</strong> ${escapeHtml(input.company ?? "—")}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(input.message ?? "—")}</p>
  `;
}

/**
 * Public, unauthenticated action invoked from the marketing contact form.
 * Persists the request before attempting notification so a Resend outage
 * never loses a submission.
 */
export async function createDemoRequest(
  input: DemoRequestInput,
  demoRequestsDb: DemoRequestsDB,
  resendClient: ResendClientInterface
): Promise<{ success: true; id: number }> {
  const limited = rateLimitHeaders(await headers(), {
    keyPrefix: "demo-request",
    windowMs: 60_000,
    max: 5,
  });
  if (limited) throw new ValidationError("Too many requests", 429);

  if (input.honeypot) {
    throw new ValidationError("Invalid submission", 400);
  }

  const name = requireString(input.name, "name", MAX_NAME);
  const email = requireEmail(input.email, "email");
  const company = optionalString(input.company, "company", MAX_NAME);
  const message = optionalString(input.message, "message", MAX_MESSAGE);

  const request = await demoRequestsDb.insertDemoRequest({
    name,
    email,
    company: company ?? null,
    message: message ?? null,
    status: "pending",
  });

  try {
    await resendClient.sendEmail({
      to: TEAM_NOTIFICATION_EMAIL,
      subject: `New demo request from ${name}`,
      html: buildNotificationHtml({ name, email, company, message }),
    });
    await demoRequestsDb.setDemoRequestStatus(request.id, "notified", null);
  } catch (err) {
    console.error("[createDemoRequest] notification email failed:", err);
    await demoRequestsDb.setDemoRequestStatus(
      request.id,
      "notify_failed",
      err instanceof Error ? err.message : String(err)
    );
  }

  return { success: true, id: request.id };
}
