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

    // Run all queries in parallel
    const [
      totalClients,
      currentPeriod,
      recentActivity,
    ] = await Promise.all([
      prisma.client.count(),
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

    if (currentPeriod) {
      const [paymentsAgg, unpaidCount] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            billingPeriodId: currentPeriod.id,
            deletedAt: null,
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.clientStatusByMonth.count({
          where: {
            billingPeriodId: currentPeriod.id,
            status: "UNPAID",
          },
        }),
      ]);

      activePaymentsThisMonth = paymentsAgg._count.id;
      revenueThisMonth = paymentsAgg._sum.amount ?? 0;
      overdueClients = unpaidCount;
    } else {
      // No period yet — all clients are effectively overdue
      overdueClients = totalClients;
    }

    return NextResponse.json(
      {
        ok: true,
        stats: {
          totalClients,
          activePaymentsThisMonth,
          overdueClients,
          revenueThisMonth,
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
