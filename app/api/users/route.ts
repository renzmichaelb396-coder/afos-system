export const runtime = "nodejs";

/**
 * /api/users
 *
 * GET    — list all users (ADMIN only)
 * POST   — create user   (ADMIN only)
 * PUT    — update user   (ADMIN only): change role, deactivate, reset password
 * DELETE — not supported (use deactivate instead)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { validateCsrf } from "@/lib/csrf";
import { registerSchema, resetPasswordSchema } from "@/lib/schemas/auth";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

// ── GET /api/users ────────────────────────────────────────────────────────────
export async function GET() {
  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        failedLoginCount: true,
        lockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, users }, { status: 200 });
  } catch (err) {
    logger.error("[users:GET]", err);
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
  }
}

// ── POST /api/users ───────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  // Rate limit: max 20 user mutations per IP per minute
  const rlResponse = checkRateLimit(getClientIp(req), RATE_LIMITS.users);
  if (rlResponse) return rlResponse;

  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));

    // Accept optional role override (defaults to ACCOUNTANT in registerSchema flow)
    const createSchema = registerSchema.extend({
      role: z.nativeEnum(Role).optional(),
    });

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password, role } = parsed.data;
    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, password: hashed, role: role ?? Role.ACCOUNTANT },
        select: { id: true, email: true, role: true, createdAt: true },
      });
      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          entityType: "User",
          entityId: created.id,
          action: "USER_CREATED",
          meta: { email: created.email, role: created.role, actorId: auth.user.id },
        },
      });
      return created;
    });

    logger.info("[users:POST] user created", { userId: user.id, actorId: auth.user.id });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code)
        : undefined;
    if (code === "P2002") {
      return NextResponse.json({ error: "Email already exists." }, { status: 409 });
    }
    logger.error("[users:POST]", err);
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}

// ── PUT /api/users ────────────────────────────────────────────────────────────
const updateUserSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("change_role"),
    userId: z.string().min(1),
    role: z.nativeEnum(Role),
  }),
  z.object({
    action: z.literal("deactivate"),
    userId: z.string().min(1),
  }),
  z.object({
    action: z.literal("activate"),
    userId: z.string().min(1),
  }),
  z.object({
    action: z.literal("reset_password"),
    userId: z.string().min(1),
    newPassword: z.string().min(8),
  }),
  z.object({
    action: z.literal("unlock"),
    userId: z.string().min(1),
  }),
]);

export async function PUT(req: Request) {
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  // Rate limit: max 20 user mutations per IP per minute
  const rlResponse = checkRateLimit(getClientIp(req), RATE_LIMITS.users);
  if (rlResponse) return rlResponse;

  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Prevent admin from deactivating themselves
    if (
      (data.action === "deactivate" || data.action === "change_role") &&
      data.userId === auth.user.id
    ) {
      return NextResponse.json(
        { error: "You cannot modify your own account via this endpoint." },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};
    let auditAction = "";
    let auditMeta: Record<string, unknown> = {};

    switch (data.action) {
      case "change_role":
        updateData = { role: data.role };
        auditAction = "USER_ROLE_CHANGED";
        auditMeta = { from: target.role, to: data.role };
        break;
      case "deactivate":
        updateData = { isActive: false };
        auditAction = "USER_DEACTIVATED";
        auditMeta = {};
        break;
      case "activate":
        updateData = { isActive: true, failedLoginCount: 0, lockedUntil: null };
        auditAction = "USER_ACTIVATED";
        auditMeta = {};
        break;
      case "reset_password": {
        // Validate password policy via resetPasswordSchema
        const pwParsed = resetPasswordSchema.safeParse({
          userId: data.userId,
          newPassword: data.newPassword,
        });
        if (!pwParsed.success) {
          return NextResponse.json(
            { error: "Validation failed", issues: pwParsed.error.issues },
            { status: 400 }
          );
        }
        const hashed = await bcrypt.hash(data.newPassword, 10);
        updateData = { password: hashed, failedLoginCount: 0, lockedUntil: null };
        auditAction = "USER_PASSWORD_RESET";
        auditMeta = { resetBy: auth.user.id };
        break;
      }
      case "unlock":
        updateData = { failedLoginCount: 0, lockedUntil: null };
        auditAction = "USER_UNLOCKED";
        auditMeta = {};
        break;
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: data.userId }, data: updateData });
      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          entityType: "User",
          entityId: data.userId,
          action: auditAction,
          meta: { ...auditMeta, actorId: auth.user.id, targetEmail: target.email },
        },
      });
    });

    logger.info(`[users:PUT] ${auditAction}`, { targetId: data.userId, actorId: auth.user.id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    logger.error("[users:PUT]", err);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}
