export const runtime = "nodejs";

/**
 * GET /api/export/payments?year=&month=
 *
 * Export payments for a given period as CSV.
 * Requires ADMIN or MANAGER role.
 */

import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: Request) {
  // Rate limit: max 10 CSV exports per IP per minute
  const rlResponse = checkRateLimit(getClientIp(req), RATE_LIMITS.export);
  if (rlResponse) return rlResponse;

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

    if (!period) {
      const filename = `afos-payments-${year}-${String(month).padStart(2, "0")}.csv`;
      return new Response("id,client_id,client_name,amount,paid_at,deleted_at\n", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const payments = await prisma.payment.findMany({
      where: { billingPeriodId: period.id, deletedAt: null },
      orderBy: { paidAt: "asc" },
      include: { client: { select: { name: true } } },
    });

    const rows = payments.map((p) =>
      [
        p.id,
        p.clientId,
        escapeCsv(p.client.name),
        p.amount,
        p.paidAt.toISOString(),
        p.deletedAt?.toISOString() ?? "",
      ].join(",")
    );

    const header = "id,client_id,client_name,amount,paid_at,deleted_at";
    const csv = [header, ...rows].join("\n");
    const filename = `afos-payments-${year}-${String(month).padStart(2, "0")}.csv`;

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "Export",
        entityId: "payments",
        action: "EXPORT_CSV",
        meta: { year, month, count: payments.length },
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
    logger.error("[export:payments:GET]", err);
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
