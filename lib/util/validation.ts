export const MAX_SHORT = 200;
export const MAX_TITLE = 500;
export const MAX_EMAIL = 320;
export const MAX_NAME = 200;
export const MAX_PHONE = 50;
export const MAX_NOTES = 10_000;
export const MAX_MESSAGE = 5_000;
export const MAX_HTML_BODY = 200_000;
export const MAX_ATTACHMENTS = 25;
export const MAX_CHAT_HISTORY = 50;
export const MAX_RECIPIENTS = 50;
// Graph's simple (non-upload-session) attachment endpoint tops out around here.
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ValidationError";
    this.status = status;
  }
}

export function requireString(
  value: unknown,
  field: string,
  max: number,
  {
    trim = true,
    allowEmpty = false,
  }: { trim?: boolean; allowEmpty?: boolean } = {}
): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string`);
  }
  const v = trim ? value.trim() : value;
  if (!allowEmpty && v.length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  if (v.length > max) {
    throw new ValidationError(`${field} exceeds max length of ${max}`);
  }
  return v;
}

export function optionalString(
  value: unknown,
  field: string,
  max: number,
  { trim = true }: { trim?: boolean } = {}
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireString(value, field, max, { trim });
}

export function requireEmail(value: unknown, field = "email"): string {
  const v = requireString(value, field, MAX_EMAIL);
  if (!EMAIL_RE.test(v)) {
    throw new ValidationError(`${field} is not a valid email`);
  }
  return v;
}

export function requireNumber(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new ValidationError(`${field} must be a number`);
  }
  return n;
}

export function requireInt(value: unknown, field: string): number {
  const n = requireNumber(value, field);
  if (!Number.isInteger(n)) {
    throw new ValidationError(`${field} must be an integer`);
  }
  return n;
}

export function requireOneOf<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[]
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

export function requireBool(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${field} must be a boolean`);
  }
  return value;
}

export function requireDateString(value: unknown, field: string): Date {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be an ISO date string`);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`${field} is not a valid date`);
  }
  return d;
}

export interface EmailAttachmentInput {
  name: string;
  data?: string;
  path?: string;
  url?: string;
  mimeType?: string;
}

export function validateEmailAttachment(
  att: EmailAttachmentInput,
  index: number
): EmailAttachmentInput {
  const name = requireString(att.name, `attachments[${index}].name`, MAX_NAME);
  const mimeType = optionalString(
    att.mimeType,
    `attachments[${index}].mimeType`,
    MAX_SHORT
  );
  const url = optionalString(att.url, `attachments[${index}].url`, 2048);
  const path = optionalString(att.path, `attachments[${index}].path`, 1024);
  if (att.data && typeof att.data !== "string") {
    throw new ValidationError(`attachments[${index}].data must be a string`);
  }
  return { name, mimeType, url, path, data: att.data };
}

export function validateAttachmentsArray(
  raw: unknown,
  maxCount: number = MAX_ATTACHMENTS
): EmailAttachmentInput[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  if (raw.length > maxCount) {
    throw new ValidationError(`attachments exceeds max of ${maxCount}`);
  }
  return raw.map((att: EmailAttachmentInput, i) =>
    validateEmailAttachment(att, i)
  );
}
