/**
 * lib/account-lockout.ts
 *
 * Account lockout logic for AFOS.
 *
 * Policy:
 *   - Lock account after MAX_FAILED_ATTEMPTS (default: 5) consecutive failures
 *   - Lockout duration: LOCKOUT_DURATION_MS (default: 15 minutes)
 *   - Each successful login resets the counter
 *   - All events are logged to AuditLog
 *
 * These functions are called exclusively from the login API route.
 * They do NOT modify the authentication flow — they wrap it.
 */

import { prisma } from "@/lib/prisma";

const MAX_FAILED_ATTEMPTS = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS ?? 5);
const LOCKOUT_DURATION_MS = Number(process.env.LOCKOUT_DURATION_MS ?? 15 * 60 * 1000); // 15 min

export type LockoutStatus =
  | { locked: false }
  | { locked: true; retryAfterMs: number; retryAfterSec: number };

/**
 * Check whether a user account is currently locked.
 * Returns locked=false if the lockout window has expired (auto-clears).
 */
export async function checkLockout(userId: string): Promise<LockoutStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true, failedLoginCount: true },
  });
  if (!user || !user.lockedUntil) return { locked: false };

  const now = Date.now();
  const lockedUntilMs = user.lockedUntil.getTime();

  if (now >= lockedUntilMs) {
    // Lockout expired — clear it
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: null, failedLoginCount: 0 },
    });
    return { locked: false };
  }

  const retryAfterMs = lockedUntilMs - now;
  return {
    locked: true,
    retryAfterMs,
    retryAfterSec: Math.ceil(retryAfterMs / 1000),
  };
}

/**
 * Record a failed login attempt.
 * Locks the account if MAX_FAILED_ATTEMPTS is reached.
 * Logs the event to AuditLog.
 */
export async function recordFailedLogin(
  userId: string,
  email: string,
  ip: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginCount: true },
  });
  const currentCount = user?.failedLoginCount ?? 0;
  const newCount = currentCount + 1;
  const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: newCount,
      lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      entityType: "User",
      entityId: userId,
      action: shouldLock ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
      meta: {
        email,
        ip,
        failedAttempts: newCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
          : null,
      },
    },
  });
}

/**
 * Record a failed login attempt for an unknown email (no userId).
 * Logs the event to AuditLog for security monitoring.
 */
export async function recordUnknownEmailAttempt(
  email: string,
  ip: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: null,
      entityType: "Auth",
      entityId: "unknown",
      action: "LOGIN_FAILED_UNKNOWN_EMAIL",
      meta: { email, ip },
    },
  });
}

/**
 * Reset failed login counter on successful login.
 * Updates lastLoginAt.
 */
export async function recordSuccessfulLogin(
  userId: string,
  ip: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      entityType: "User",
      entityId: userId,
      action: "LOGIN_SUCCESS",
      meta: { ip },
    },
  });
}
