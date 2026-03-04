export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { validateCsrf } from "@/lib/csrf";
import { createPaymentSchema } from "@/lib/schemas/payments";

async function getOrCreatePeriod(year: number, month: number) {
  let period = await prisma.billingPeriod.findUnique({
    where: { year_month: { year, month } },
  });

  if (!period) {
    period = await prisma.billingPeriod.create({ data: { year, month } });
  }

  return period;
}

export async function POST(req: Request) {
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireUser({ roles: [Role.ADMIN, Role.MANAGER] });
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { clientId, amount, year, month } = parsed.data;

    const period = await getOrCreatePeriod(year, month);
    if (period.isClosed) {
      return NextResponse.json({ error: "Billing period is closed" }, { status: 409 });
    }

    const idempotencyKey = req.headers.get("idempotency-key") || undefined;

    if (idempotencyKey) {
      const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
      if (existing) return NextResponse.json({ ok: true, payment: existing }, { status: 200 });
    }

    // Duplicate payment protection: check if a non-deleted payment already exists
    // for this client in this billing period.
    // Admins may override by passing { override: true } in the request body.
    const { override } = (body as { override?: boolean });
    const duplicate = await prisma.payment.findFirst({
      where: { clientId, billingPeriodId: period.id, deletedAt: null },
    });
    if (duplicate && !override) {
      return NextResponse.json(
        {
          error: "Payment already recorded for this client in this billing period.",
          code: "DUPLICATE_PAYMENT",
          existingPaymentId: duplicate.id,
        },
        { status: 409 }
      );
    }

    const paidAt = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));

    const created = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          clientId,
          billingPeriodId: period.id,
          amount,
          paidAt,
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "Payment",
          entityId: payment.id,
          action: "CREATE",
          meta: {
            actorUserId: auth.user.id,
            clientId,
            billingPeriodId: period.id,
            year,
            month,
            amount,
            idempotencyKey: idempotencyKey ?? null,
          },
        },
      });

      return payment;
    });

    return NextResponse.json({ ok: true, payment: created }, { status: 201 });
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code)
        : undefined;
    if (code === "P0001") {
      return NextResponse.json({ error: "Billing period is closed" }, { status: 409 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create payment", detail: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const auth = await requireUser({ roles: [Role.ADMIN, Role.MANAGER] });
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = Number(searchParams.get("year") ?? now.getFullYear());
  const month = Number(searchParams.get("month") ?? (now.getMonth() + 1));

  // Resolve billing period for the requested period (create if absent)
  const period = await getOrCreatePeriod(year, month);

  const payments = await prisma.payment.findMany({
    where: { billingPeriodId: period.id, deletedAt: null },
    orderBy: { paidAt: "desc" },
    take: 100,
    include: { client: { select: { name: true } } },
  });

  return NextResponse.json(
    { ok: true, year, month, isClosed: period.isClosed, payments },
    { status: 200 }
  );
}
