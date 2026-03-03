/**
 * lib/session-cookie.ts
 *
 * Single source of truth for the afos_session cookie configuration.
 * The Secure flag is ONLY set when NODE_ENV === "production" so that
 * local development over plain HTTP continues to work.
 *
 * maxAge: 8 hours (28 800 seconds) — suitable for a working-day session.
 * Adjust SESSION_MAX_AGE env var to override (value in seconds).
 */

const IS_PROD = process.env.NODE_ENV === "production";
const MAX_AGE = Number(process.env.SESSION_MAX_AGE ?? 28_800); // 8 h default

export const SESSION_COOKIE_NAME = "afos_session";

/** Options compatible with NextResponse.cookies.set() */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

/**
 * Build the raw Set-Cookie header string.
 * Used as a fallback for curl / non-browser clients.
 */
export function buildSetCookieHeader(userId: string): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${userId}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${MAX_AGE}`,
  ];
  if (IS_PROD) parts.push("Secure");
  return parts.join("; ");
}
