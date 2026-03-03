export const runtime = "nodejs";

/**
 * GET /api/audit
 *
 * Returns paginated, filterable audit log entries.
 * Requires ADMIN role.
 *
 * Query params:
 *   page     — page number (default: 1)
 *   limit    — items per page (default: 50, max: 200)
 *   userId   — filter by userId
 *   action   — filter by action (partial match, case-insensitive)
 *   from     — ISO date string (start of range)
 *   to       — ISO date string (end of range)
 *   search   — full-text search across action, entityType, entityId
 *
 * Backward-compatible: callers that don't pass any params still get
 * the first 50 results sorted newest-first, same as before.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const skip = (page - 1) * limit;

    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const search = searchParams.get("search") || undefined;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;

    if (action) {
      where.action = { contains: action, mode: "insensitive" };
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    logger.error("[audit:GET]", err);
    return NextResponse.json({ error: "Failed to fetch audit log." }, { status: 500 });
  }
}
