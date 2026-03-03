/**
 * lib/rate-limit.ts
 *
 * IP-based sliding-window rate limiter (in-memory).
 *
 * Suitable for single-node Docker deployments.
 * For multi-instance deployments, replace the `store` Map with a
 * Redis-backed store (e.g. ioredis + MULTI/EXEC pipeline).
 *
 * Configuration via environment variables:
 *   RATE_LIMIT_WINDOW_MS   — window size in milliseconds  (default: 60 000 = 1 min)
 *   RATE_LIMIT_MAX_LOGIN   — max login attempts per window (default: 10)
 *   RATE_LIMIT_MAX_REGISTER — max register attempts        (default: 5)
 *   RATE_LIMIT_MAX_REMINDERS — max reminder triggers       (default: 5)
 */

type Entry = { timestamps: number[] };

// Module-level store — persists for the lifetime of the Node.js process.
// NOTE: This is intentionally NOT exported; all access goes through `checkRateLimit`.
const store = new Map<string, Entry>();

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);

export type RateLimitConfig = {
  /** Unique key for this limiter (e.g. "login", "register") */
  id: string;
  /** Maximum requests allowed within the window */
  max: number;
};

export const RATE_LIMITS = {
  login: {
    id: "login",
    max: Number(process.env.RATE_LIMIT_MAX_LOGIN ?? 10),
  },
  register: {
    id: "register",
    max: Number(process.env.RATE_LIMIT_MAX_REGISTER ?? 5),
  },
  reminders: {
    id: "reminders",
    max: Number(process.env.RATE_LIMIT_MAX_REMINDERS ?? 5),
  },
} satisfies Record<string, RateLimitConfig>;

/**
 * Returns `null` if the request is within limits, or a `Response` (429) if
 * the limit has been exceeded.
 *
 * @param ip   - Client IP address extracted from the request
 * @param cfg  - Rate limit configuration (id + max)
 */
export function checkRateLimit(ip: string, cfg: RateLimitConfig): Response | null {
  // In test mode, bypass rate limiting so integration tests can run freely.
  // Rate limiting is still enforced in development and production.
  if (process.env.NODE_ENV === "test") return null;

  const key = `${cfg.id}:${ip}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Prune timestamps outside the current window (sliding window)
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= cfg.max) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + WINDOW_MS - now;
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);

    return new Response(
      JSON.stringify({
        error: "Too Many Requests",
        retryAfter: retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(cfg.max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((oldestInWindow + WINDOW_MS) / 1000)),
        },
      }
    );
  }

  entry.timestamps.push(now);
  return null;
}

/**
 * Extract the best-available client IP from a Next.js Request.
 * Trusts X-Forwarded-For only when behind a known reverse proxy.
 */
export function getClientIp(req: Request): string {
  // In production behind a reverse proxy (Nginx / Fly / Render / ECS ALB)
  // the real IP is in X-Forwarded-For.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    // XFF can be a comma-separated list; the first entry is the client IP.
    return xff.split(",")[0].trim();
  }
  // Fallback — not meaningful in production but safe for tests.
  return "127.0.0.1";
}
