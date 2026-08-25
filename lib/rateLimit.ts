import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * In-memory, per-process store. This is the right amount of engineering for
 * this project's scale — a single Node process serving one school network —
 * but it has two real limits worth knowing before this runs somewhere bigger:
 * it resets on every restart/deploy, and it does not coordinate across
 * multiple server instances behind a load balancer. Swap this module for a
 * shared store (Redis, etc.) first if either of those becomes true.
 */
const buckets = new Map<string, Bucket>();

let lastCleanup = Date.now();
function cleanupIfDue() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Checks AND consumes one attempt against the given key's bucket. */
export function checkRateLimit(key: string, { limit, windowMs }: RateLimitOptions): RateLimitResult {
  cleanupIfDue();
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export class RateLimitedError extends Error {
  status = 429;
  constructor(retryAfterSeconds: number) {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    super(`Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`);
  }
}

/** Throws a RateLimitedError (with `.status = 429`) if this key has exceeded its limit. */
export function assertNotRateLimited(key: string, opts: RateLimitOptions): void {
  const result = checkRateLimit(key, opts);
  if (!result.allowed) throw new RateLimitedError(result.retryAfterSeconds);
}

/** Extracts a best-effort client IP from a standard Fetch API Request/NextRequest. */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/** Same idea, but for NextAuth's `authorize(credentials, req)` — its `req.headers` is a plain object, not a Headers instance. */
export function getClientIpFromHeaderRecord(headers?: Record<string, string | undefined> | null): string {
  const forwarded = headers?.["x-forwarded-for"] || headers?.["X-Forwarded-For"];
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = headers?.["x-real-ip"] || headers?.["X-Real-Ip"];
  if (real) return real.trim();
  return "unknown";
}
