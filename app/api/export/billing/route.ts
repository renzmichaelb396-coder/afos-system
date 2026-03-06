export const runtime = "nodejs";
/**
 * GET /api/export/billing?year=&month=
 *
 * Export billing summary for a given period as CSV.
 * Columns: clientName, billingPeriod, status, amount, datePaid
 * Filename: billing-summary-YYYY-MM.csv
 *
 * Requires export_csv permission (ADMIN or MANAGER).
 */
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: Request) {
  // Rate limit: max 10 CSV exports per IP per minute
  const rlResponse = checkRateLimit(getClientIp(req), RATE_LIMITS.export);
  if (rlResponse) return rlResponse;

  const auth = await requireUser();
  if (auth.error) return auth.error;

  if (!can(auth.user, "export_csv")) {
    return new Response(JSON.stringify({ error: "Forbidden", code: "RBAC_FORBIDDEN" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year  = Number(searchParams.get("year")  ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

    // Find the billing period (may not exist yet)
    const period = await prisma.billingPeriod.findUnique({
      where: { year_month: { year, month } },
    });

    // Fetch all active clients with payment status and actual payment record
    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        monthlyFee: true,
        monthlyStatuses: period
          ? {
              where: { billingPeriodId: period.id },
              select: { status: true },
            }
          : false,
        payments: period
          ? {
              where: { billingPeriodId: period.id, deletedAt: null },
              select: { amount: true, paidAt: true },
              take: 1,
            }
          : false,
      },
    });

    const billingPeriodLabel = `${year}-${String(month).padStart(2, "0")}`;

    const rows = clients.map((c) => {
      const status   = c.monthlyStatuses?.[0]?.status ?? "UNPAID";
      const payment  = c.payments?.[0];
      const amount   = payment ? payment.amount : 0;
      const datePaid = payment ? payment.paidAt.toISOString().split("T")[0] : "";

      return [
        escapeCsv(c.name),
        billingPeriodLabel,
        status,
        amount,
        datePaid,
      ].join(",");
    });

    const header = "clientName,billingPeriod,status,amount,datePaid";
    const csv    = [header, ...rows].join("\n");
    const filename = `billing-summary-${billingPeriodLabel}.csv`;

    // Log the export to audit trail
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "Export",
        entityId: "billing",
        action: "EXPORT_CSV",
        meta: { year, month, count: clients.length, filename },
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
    logger.error("[export:billing:GET]", err);
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
