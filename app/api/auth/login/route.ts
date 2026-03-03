export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SESSION_COOKIE_NAME, sessionCookieOptions, buildSetCookieHeader } from "@/lib/session-cookie";
import { loginSchema } from "@/lib/schemas/auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import {
  checkLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
  recordUnknownEmailAttempt,
} from "@/lib/account-lockout";

export async function POST(req: Request) {
  // CSRF check
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  // Rate limit: max 10 login attempts per IP per minute
  const ip = getClientIp(req);
  const rlResponse = checkRateLimit(ip, RATE_LIMITS.login);
  if (rlResponse) return rlResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Log unknown email attempt for security monitoring
      await recordUnknownEmailAttempt(email, ip);
      logger.warn("[login] unknown email attempt", { email: email.replace(/(.{2}).*(@.*)/, "$1***$2"), ip });
      // Return same message as wrong password to prevent user enumeration
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if account is deactivated
    if (!user.isActive) {
      logger.warn("[login] inactive account attempt", { userId: user.id, ip });
      return NextResponse.json(
        { error: "Account is deactivated. Contact your administrator." },
        { status: 403 }
      );
    }

    // Check account lockout
    const lockout = await checkLockout(user.id);
    if (lockout.locked) {
      const mins = Math.ceil(lockout.retryAfterSec / 60);
      logger.warn("[login] locked account attempt", { userId: user.id, ip, retryAfterSec: lockout.retryAfterSec });
      return NextResponse.json(
        {
          error: `Account is temporarily locked due to too many failed attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
          code: "ACCOUNT_LOCKED",
          retryAfter: lockout.retryAfterSec,
        },
        {
          status: 423,
          headers: { "Retry-After": String(lockout.retryAfterSec) },
        }
      );
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      // Record failed attempt (may trigger lockout)
      await recordFailedLogin(user.id, email, ip);
      logger.warn("[login] invalid password", { userId: user.id, ip });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Successful login — reset counter and record
    await recordSuccessfulLogin(user.id, ip);
    logger.info("[login] success", { userId: user.id, role: user.role, ip });

    const res = NextResponse.json({ ok: true });

    // Set-Cookie via raw header (curl + non-browser clients)
    res.headers.append("Set-Cookie", buildSetCookieHeader(user.id));

    // Set-Cookie via NextResponse API (browser)
    res.cookies.set(SESSION_COOKIE_NAME, user.id, sessionCookieOptions);

    return res;
  } catch (err: unknown) {
    logger.error("[login] unexpected error", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
