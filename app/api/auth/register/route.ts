export const runtime = "nodejs";

/**
 * POST /api/auth/register
 *
 * Bootstrap mode  (User.count === 0): open — creates the first ADMIN.
 * Locked mode     (User.count  >  0): requires an active ADMIN session.
 *
 * This prevents open registration on a live system while still allowing
 * a clean first-run bootstrap without any pre-existing credentials.
 *
 * Password policy is enforced via registerSchema (Zod).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { registerSchema } from "@/lib/schemas/auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  // CSRF check
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  // Rate limit: max 5 registration attempts per IP per minute
  const ip = getClientIp(req);
  const rlResponse = checkRateLimit(ip, RATE_LIMITS.register);
  if (rlResponse) return rlResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // ── Bootstrap gate ──────────────────────────────────────────────────────
    // Check user count FIRST (cheap count query, no full table scan).
    const userCount = await prisma.user.count();
    let actorId: string | null = null;

    if (userCount > 0) {
      // System already has users — require an authenticated ADMIN session.
      const auth = await requireUser({ roles: [Role.ADMIN] });
      if (auth.error) return auth.error;
      actorId = auth.user.id;
    }
    // ────────────────────────────────────────────────────────────────────────

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const count = await tx.user.count();
      const role: Role = count === 0 ? Role.ADMIN : Role.ACCOUNTANT;
      const created = await tx.user.create({
        data: { email, password: hashed, role },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          entityType: "User",
          entityId: created.id,
          action: "USER_CREATED",
          meta: { email: created.email, role: created.role, ip },
        },
      });
      return created;
    });

    logger.info("[register] user created", { userId: user.id, role: user.role, actorId, ip });

    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code)
        : undefined;

    if (code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    logger.error("[register] unexpected error", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
