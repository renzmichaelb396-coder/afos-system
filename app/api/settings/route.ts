export const runtime = "nodejs";

/**
 * /api/settings
 *
 * GET  — retrieve all system settings (ADMIN only)
 * PUT  — upsert one or more settings   (ADMIN only)
 *
 * Settings are stored as key-value pairs in the SystemSettings table.
 * All values are stored as strings; the API layer handles type coercion.
 *
 * Supported keys:
 *   billing_cycle_day       — Day of month billing cycle starts (1-28)
 *   reminder_interval_days  — Days between reminder emails
 *   period_lock_enabled     — "true" | "false"
 *   app_version             — Read-only, set from package.json
 *   system_name             — Display name for the system
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { validateCsrf } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ALLOWED_KEYS = [
  "billing_cycle_day",
  "reminder_interval_days",
  "period_lock_enabled",
  "system_name",
] as const;

type SettingKey = (typeof ALLOWED_KEYS)[number];

const settingsUpdateSchema = z.record(
  z.enum(ALLOWED_KEYS),
  z.string().max(500)
);

// ── GET /api/settings ─────────────────────────────────────────────────────────
export async function GET() {
  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const rows = await prisma.systemSettings.findMany({
      orderBy: { key: "asc" },
    });

    // Build a typed map with defaults for missing keys
    const defaults: Record<SettingKey, string> = {
      billing_cycle_day: "1",
      reminder_interval_days: "7",
      period_lock_enabled: "false",
      system_name: "AFOS",
    };

    const settings: Record<string, string> = { ...defaults };
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    // Append read-only metadata
    const pkg = await import("@/package.json").catch(() => ({ version: "1.0.0" }));
    const meta = {
      app_version: (pkg as { version?: string }).version ?? "1.0.0",
      node_env: process.env.NODE_ENV ?? "production",
      db_provider: "PostgreSQL (Neon)",
    };

    return NextResponse.json({ ok: true, settings, meta }, { status: 200 });
  } catch (err) {
    logger.error("[settings:GET]", err);
    return NextResponse.json({ error: "Failed to fetch settings." }, { status: 500 });
  }
}

// ── PUT /api/settings ─────────────────────────────────────────────────────────
export async function PUT(req: Request) {
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = settingsUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Upsert each setting in a transaction
    await prisma.$transaction(
      Object.entries(updates).map(([key, value]) =>
        prisma.systemSettings.upsert({
          where: { key },
          create: { key, value, updatedBy: auth.user.id },
          update: { value, updatedBy: auth.user.id },
        })
      )
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "SystemSettings",
        entityId: "settings",
        action: "SETTINGS_UPDATED",
        meta: { keys: Object.keys(updates), actorId: auth.user.id },
      },
    });

    logger.info("[settings:PUT] settings updated", { keys: Object.keys(updates), actorId: auth.user.id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    logger.error("[settings:PUT]", err);
    return NextResponse.json({ error: "Failed to update settings." }, { status: 500 });
  }
}
