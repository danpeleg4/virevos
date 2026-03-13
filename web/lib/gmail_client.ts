import { google } from "googleapis";
import { getFreshGoogleAccessToken } from "./google_access";

export async function getGmailClient(userId: string) {
  const accessToken = await getFreshGoogleAccessToken(userId);
  if (!accessToken) return null;
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

// Parse MIME message parts recursively to extract HTML/text body
export function parseEmailBody(payload: any): {
  html: string | null;
  text: string | null;
} {
  if (!payload) return { html: null, text: null };

  function decode(data: string): string {
    return Buffer.from(
      data.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
  }

  function findParts(
    part: any,
    html: string | null,
    text: string | null
  ): { html: string | null; text: string | null } {
    if (!part) return { html, text };
    if (part.mimeType === "text/html" && part.body?.data) {
      return { html: decode(part.body.data), text };
    }
    if (part.mimeType === "text/plain" && part.body?.data) {
      return { html, text: decode(part.body.data) };
    }
    if (part.parts) {
      let result = { html, text };
      for (const subpart of part.parts) {
        const sub = findParts(subpart, result.html, result.text);
        if (!result.html && sub.html) result.html = sub.html;
        if (!result.text && sub.text) result.text = sub.text;
      }
      return result;
    }
    return { html, text };
  }

  return findParts(payload, null, null);
}

// Parse email header value (handles encoded words like =?UTF-8?...?=)
export function parseHeaderValue(value: string): string {
  return (
    value?.replace(
      /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
      (_, charset, encoding, text) => {
        if (encoding.toLowerCase() === "b") {
          return Buffer.from(text, "base64").toString("utf-8");
        }
        return text.replace(/_/g, " ");
      }
    ) ?? ""
  );
}

// Extract name and email from "Name <email>" format
export function parseEmailAddress(raw: string): {
  name: string;
  email: string;
} {
  const match = raw?.match(/^(.*?)\s*<(.+?)>$/);
  if (match)
    return {
      name: match[1].trim().replace(/^"|"$/g, ""),
      email: match[2].trim(),
    };
  return { name: "", email: raw?.trim() ?? "" };
}

export function getHeader(
  headers: Array<{ name: string; value: string }>,
  name: string
): string {
  return (
    headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ??
    ""
  );
}

export interface EmailAttachment {
  name: string;
  contentBase64: string;
  mimeType: string;
}

// Build RFC 2822 email message for Gmail API
export function buildRawEmail({
  to,
  toName,
  from,
  fromName,
  subject,
  bodyHtml,
  bodyText,
  inReplyTo,
  references,
  attachments,
}: {
  to: string;
  toName?: string;
  from: string;
  fromName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: EmailAttachment[];
}): string {
  const altBoundary = `alt_${Date.now()}`;
  const mixedBoundary = `mixed_${Date.now() + 1}`;
  const toHeader = toName ? `"${toName}" <${to}>` : to;
  const fromHeader = fromName ? `"${fromName}" <${from}>` : from;
  const hasAttachments = attachments && attachments.length > 0;

  const headers = [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: ${hasAttachments ? `multipart/mixed; boundary="${mixedBoundary}"` : `multipart/alternative; boundary="${altBoundary}"`}`,
  ];
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  if (references) headers.push(`References: ${references}`);

  const altParts = [
    `--${altBoundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    bodyText || bodyHtml.replace(/<[^>]*>/g, ""),
    ``,
    `--${altBoundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    bodyHtml,
    ``,
    `--${altBoundary}--`,
  ].join("\r\n");

  let body: string;
  if (hasAttachments) {
    const attachmentParts = attachments
      .map((att) =>
        [
          `--${mixedBoundary}`,
          `Content-Type: ${att.mimeType}; name="${att.name}"`,
          `Content-Transfer-Encoding: base64`,
          `Content-Disposition: attachment; filename="${att.name}"`,
          ``,
          att.contentBase64.match(/.{1,76}/g)?.join("\r\n") ?? att.contentBase64,
          ``,
        ].join("\r\n")
      )
      .join("\r\n");

    body = [
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      ``,
      altParts,
      ``,
      attachmentParts,
      `--${mixedBoundary}--`,
    ].join("\r\n");
  } else {
    body = altParts;
  }

  const message = headers.join("\r\n") + "\r\n\r\n" + body;
  return Buffer.from(message).toString("base64url");
}

// List attachments from a message payload
export function listAttachments(payload: any, attachments: any[] = []): any[] {
  if (!payload) return attachments;
  if (payload.filename && payload.body?.attachmentId) {
    attachments.push({
      filename: payload.filename,
      mimeType: payload.mimeType,
      size: payload.body.size,
      attachmentId: payload.body.attachmentId,
    });
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      listAttachments(part, attachments);
    }
  }
  return attachments;
}
