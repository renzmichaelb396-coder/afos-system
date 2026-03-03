export const runtime = "nodejs";

/**
 * GET /api/export/clients?year=&month=
 *
 * Export clients with their payment status for a given period as CSV.
 * Requires ADMIN or MANAGER role.
 */

import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const auth = await requireUser({ roles: [Role.ADMIN, Role.MANAGER] });
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

    const period = await prisma.billingPeriod.findUnique({
      where: { year_month: { year, month } },
    });

    const clients = await prisma.client.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        monthlyFee: true,
        createdAt: true,
        monthlyStatuses: period
          ? {
              where: { billingPeriodId: period.id },
              select: { status: true },
            }
          : false,
      },
    });

    const rows = clients.map((c) => {
      const status = c.monthlyStatuses?.[0]?.status ?? "NO_PERIOD";
      return [
        c.id,
        escapeCsv(c.name),
        escapeCsv(c.email ?? ""),
        c.monthlyFee,
        status,
        c.createdAt.toISOString(),
      ].join(",");
    });

    const header = "id,name,email,monthly_fee,status,created_at";
    const csv = [header, ...rows].join("\n");
    const filename = `afos-clients-${year}-${String(month).padStart(2, "0")}.csv`;

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "Export",
        entityId: "clients",
        action: "EXPORT_CSV",
        meta: { year, month, count: clients.length },
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
    logger.error("[export:clients:GET]", err);
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
