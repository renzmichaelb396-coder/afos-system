export const runtime = "nodejs";

/**
 * POST /api/auth/register
 *
 * Bootstrap mode  (User.count === 0): open — creates the first ADMIN.
 * Locked mode     (User.count  >  0): requires an active ADMIN session.
 *
 * This prevents open registration on a live system while still allowing
 * a clean first-run bootstrap without any pre-existing credentials.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { registerSchema } from "@/lib/schemas/auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";

export async function POST(req: Request) {
  // CSRF check
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  // Rate limit: max 5 registration attempts per IP per minute
  const rlResponse = checkRateLimit(getClientIp(req), RATE_LIMITS.register);
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

    if (userCount > 0) {
      // System already has users — require an authenticated ADMIN session.
      const auth = await requireUser({ roles: [Role.ADMIN] });
      if (auth.error) return auth.error;
    }
    // ────────────────────────────────────────────────────────────────────────

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const count = await tx.user.count();
      const role: Role = count === 0 ? Role.ADMIN : Role.ACCOUNTANT;
      return tx.user.create({
        data: { email, password: hashed, role },
      });
    });

    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (err: unknown) {
    const meta =
      err && typeof err === "object"
        ? {
            name: "name" in err ? String((err as { name?: unknown }).name) : undefined,
            code: "code" in err ? String((err as { code?: unknown }).code) : undefined,
            message: "message" in err ? String((err as { message?: unknown }).message) : String(err),
          }
        : { message: String(err) };

    if (meta.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    console.error("[register]", err);
    return NextResponse.json({ error: "Failed to register", ...meta }, { status: 500 });
  }
}
