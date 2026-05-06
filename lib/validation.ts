export const MAX_SHORT = 200;
export const MAX_TITLE = 500;
export const MAX_EMAIL = 320;
export const MAX_NAME = 200;
export const MAX_PHONE = 50;
export const MAX_NOTES = 10_000;
export const MAX_MESSAGE = 5_000;
export const MAX_HTML_BODY = 200_000;
export const MAX_ATTACHMENT_BASE64 = 30_000_000;
export const MAX_ATTACHMENTS = 25;
export const MAX_CHAT_HISTORY = 50;
export const MAX_RECIPIENTS = 50;

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

export function optionalEmail(
  value: unknown,
  field = "email"
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireEmail(value, field);
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

export function optionalBool(
  value: unknown,
  field: string
): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  return requireBool(value, field);
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
