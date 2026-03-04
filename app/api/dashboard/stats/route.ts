export const runtime = "nodejs";

/**
 * GET /api/dashboard/stats
 *
 * Returns KPI data for the enhanced dashboard.
 * Requires authenticated user (any role).
 *
 * Response shape:
 * {
 *   totalClients: number,
 *   activePaymentsThisMonth: number,
 *   overdueClients: number,
 *   revenueThisMonth: number,
 *   clientsPaid: number,           // v2.2 — status = PAID this month
 *   clientsUnpaid: number,         // v2.2 — status = UNPAID this month
 *   clientsMissingPayment: number, // v2.2 — no status record at all this month
 *   recentActivity: AuditLog[],
 *   currentPeriod: { year, month, isClosed }
 * }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { logger } from "@/lib/logger";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [totalClients, currentPeriod, recentActivity] = await Promise.all([
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.billingPeriod.findUnique({
        where: { year_month: { year, month } },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    let activePaymentsThisMonth = 0;
    let overdueClients = 0;
    let revenueThisMonth = 0;
    let clientsPaid = 0;
    let clientsUnpaid = 0;
    let clientsMissingPayment = 0;

    if (currentPeriod) {
      const [paymentsAgg, paidCount, unpaidCount, statusCount] = await Promise.all([
        prisma.payment.aggregate({
          where: { billingPeriodId: currentPeriod.id, deletedAt: null },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.clientStatusByMonth.count({
          where: { billingPeriodId: currentPeriod.id, status: "PAID" },
        }),
        prisma.clientStatusByMonth.count({
          where: { billingPeriodId: currentPeriod.id, status: "UNPAID" },
        }),
        prisma.clientStatusByMonth.count({
          where: { billingPeriodId: currentPeriod.id },
        }),
      ]);

      activePaymentsThisMonth = paymentsAgg._count.id;
      revenueThisMonth = paymentsAgg._sum.amount ?? 0;
      overdueClients = unpaidCount;
      clientsPaid = paidCount;
      clientsUnpaid = unpaidCount;
      // Clients with no status record at all for this period
      clientsMissingPayment = Math.max(0, totalClients - statusCount);
    } else {
      // No period yet — all clients are missing payment
      overdueClients = totalClients;
      clientsMissingPayment = totalClients;
    }

    return NextResponse.json(
      {
        ok: true,
        stats: {
          totalClients,
          activePaymentsThisMonth,
          overdueClients,
          revenueThisMonth,
          clientsPaid,
          clientsUnpaid,
          clientsMissingPayment,
          currentPeriod: currentPeriod
            ? { year, month, isClosed: currentPeriod.isClosed }
            : { year, month, isClosed: false },
        },
        recentActivity,
      },
      { status: 200 }
    );
  } catch (err) {
    logger.error("[dashboard:stats:GET]", err);
    return NextResponse.json({ error: "Failed to fetch dashboard stats." }, { status: 500 });
  }
}
