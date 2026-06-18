import { NextRequest, NextResponse } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

interface HeaderReader {
  get(name: string): string | null;
}

function getClientIp(headers: HeaderReader | undefined): string {
  if (!headers || typeof headers.get !== "function") return "unknown";
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

interface ConsumeResult {
  limited: boolean;
  retryAfter: number;
}

function consume(ip: string, opts: RateLimitOptions): ConsumeResult {
  if (process.env.NODE_ENV === "test") return { limited: false, retryAfter: 0 };

  const now = Date.now();
  const key = `${opts.keyPrefix}:${ip}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { limited: false, retryAfter: 0 };
  }

  if (bucket.count >= opts.max) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { limited: true, retryAfter };
  }

  bucket.count += 1;
  return { limited: false, retryAfter: 0 };
}

export function rateLimit(
  req: NextRequest,
  opts: RateLimitOptions
): NextResponse | null {
  const { limited, retryAfter } = consume(getClientIp(req.headers), opts);
  if (!limited) return null;

  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    }
  );
}

/**
 * Rate limit helper for server actions, which read request headers via
 * `headers()` from `next/headers` rather than receiving a `NextRequest`.
 * Returns `true` when the caller is over the limit and should be rejected.
 */
export function rateLimitHeaders(
  headers: HeaderReader,
  opts: RateLimitOptions
): boolean {
  return consume(getClientIp(headers), opts).limited;
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, 60_000).unref?.();
}
