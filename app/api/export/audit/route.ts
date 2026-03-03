export const runtime = "nodejs";

/**
 * GET /api/export/audit?userId=&action=&from=&to=&search=
 *
 * Export audit logs as CSV, respecting the same filters as the audit log viewer.
 * Requires ADMIN role.
 */

import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const search = searchParams.get("search") || undefined;

    const where: Prisma.AuditLogWhereInput = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: "insensitive" };
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

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000, // safety cap
    });

    const rows = logs.map((l) =>
      [
        l.id,
        escapeCsv(l.action),
        escapeCsv(l.entityType),
        escapeCsv(l.entityId),
        escapeCsv(l.userId ?? ""),
        l.createdAt.toISOString(),
        escapeCsv(l.meta ? JSON.stringify(l.meta) : ""),
      ].join(",")
    );

    const header = "id,action,entity_type,entity_id,user_id,created_at,meta";
    const csv = [header, ...rows].join("\n");
    const filename = `afos-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

    // [S-2 HOTFIX] Log the export action itself so the chain of custody is preserved.
    // Filters used are stored in meta so auditors know exactly what was exported.
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "AuditLog",
        entityId: "audit-export",
        action: "EXPORT_CSV",
        meta: {
          filters: { userId: userId ?? null, action: action ?? null, from: from ?? null, to: to ?? null, search: search ?? null },
          rowCount: logs.length,
          filename,
        },
      },
    });

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    logger.error("[export:audit:GET]", err);
    return new Response(JSON.stringify({ error: "Export failed." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
