export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { validateCsrf } from "@/lib/csrf";
import { billingQuerySchema, closePeriodSchema } from "@/lib/schemas/billing";
import { logger } from "@/lib/logger";

async function getOrCreatePeriod(year: number, month: number) {
  let period = await prisma.billingPeriod.findUnique({
    where: { year_month: { year, month } },
  });

  if (!period) {
    period = await prisma.billingPeriod.create({ data: { year, month } });
  }

  return period;
}

export async function GET(req: Request) {
  const auth = await requireUser({ roles: [Role.ADMIN, Role.MANAGER] });
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const parsed = billingQuerySchema.safeParse({
    year: searchParams.get("year"),
    month: searchParams.get("month"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { year, month } = parsed.data;

  try {
    const period = await getOrCreatePeriod(year, month);
    return NextResponse.json(
      { ok: true, periodId: period.id, year, month, isClosed: period.isClosed },
      { status: 200 }
    );
  } catch (err: unknown) {
    logger.error("[billing:GET]", err);
    return NextResponse.json({ error: "Failed to fetch billing period." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = closePeriodSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { year, month } = parsed.data;
    const period = await getOrCreatePeriod(year, month);

    if (period.isClosed) {
      return NextResponse.json(
        { ok: true, periodId: period.id, year, month, isClosed: true },
        { status: 200 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const closed = await tx.billingPeriod.update({
        where: { id: period.id },
        data: { isClosed: true, closedAt: new Date(), closedById: auth.user.id },
        select: {
          id: true,
          year: true,
          month: true,
          isClosed: true,
          closedAt: true,
          closedById: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          entityType: "BillingPeriod",
          entityId: closed.id,
          action: "CLOSE",
          meta: { actorUserId: auth.user.id, year: closed.year, month: closed.month },
        },
      });

      return closed;
    });

    logger.info("[billing:POST] period closed", {
      periodId: updated.id,
      year: updated.year,
      month: updated.month,
      actorId: auth.user.id,
    });

    return NextResponse.json(
      {
        ok: true,
        periodId: updated.id,
        year: updated.year,
        month: updated.month,
        isClosed: updated.isClosed,
        closedAt: updated.closedAt,
        closedById: updated.closedById,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    logger.error("[billing:POST]", err);
    return NextResponse.json({ error: "Failed to close billing period." }, { status: 500 });
  }
}
