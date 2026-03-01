export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";

function logEvent(data: Record<string, unknown>) {
  if (process.env.LOG_EVENTS === "1") console.log(JSON.stringify({ ts: new Date().toISOString(), ...data }));
}

async function getOrCreatePeriod(year: number, month: number) {
  let period = await prisma.billingPeriod.findUnique({
    where: { year_month: { year, month } },
  });

  if (!period) {
    period = await prisma.billingPeriod.create({ data: { year, month } });
  }

  return period;
}

async function assertPeriodOpen(periodId: string) {
  const period = await prisma.billingPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new Error("BillingPeriod not found");
  if (period.isClosed) {
    const err = new Error("BillingPeriod is closed") as Error & { code?: string };
    err.code = "BILLING_PERIOD_CLOSED";
    throw err;
  }
  return period;
}

// CREATE payment (used by integration tests)
export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const body = await req.json();

    const clientIdRaw = body?.clientId;
    const clientId = clientIdRaw === null || clientIdRaw === undefined ? "" : String(clientIdRaw);

    const amountRaw = body?.amount;
    const amount = typeof amountRaw === "string" ? Number(amountRaw) : amountRaw;

    const year = Number(body?.year);
    const month = Number(body?.month);

    if (!clientId) {
      return NextResponse.json({ error: "Missing or invalid clientId" }, { status: 400 });
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Missing or invalid amount" }, { status: 400 });
    }
    if (!Number.isInteger(year) || year < 2000 || year > 3000) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const period = await getOrCreatePeriod(year, month);
    if (period.isClosed) {
      logEvent({ event: "PAYMENT_CREATE", route: "/api/payments", result: "err", reason: "period_closed", year, month });
      return NextResponse.json({ error: "Billing period is closed" }, { status: 409 });
    }

    const idempotencyKey = req.headers.get("idempotency-key") || undefined;

    if (idempotencyKey) {
      const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
      if (existing) {
        logEvent({ event: "PAYMENT_CREATE", route: "/api/payments", result: "ok", mode: "idempotent_hit", idempotencyKey });
        return NextResponse.json({ ok: true, payment: existing }, { status: 200 });
      }
    }

    // Use a deterministic paidAt inside the requested month
    const paidAt = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));

    const created = await prisma.payment.create({
      data: {
        clientId,
        billingPeriodId: period.id,
        amount,
        paidAt,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
    });

    logEvent({ event: "PAYMENT_CREATE", route: "/api/payments", result: "ok", paymentId: created.id, year, month });
    return NextResponse.json({ ok: true, payment: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logEvent({ event: "PAYMENT_CREATE", route: "/api/payments", result: "err", message: msg });
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}

// Existing delete logic (kept)
export async function GET(req: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await req.json();
    const paymentId = body?.paymentId;
    const reason = typeof body?.reason === "string" ? body.reason : null;

    if (!paymentId || typeof paymentId !== "string") {
      return NextResponse.json({ error: "Missing or invalid paymentId" }, { status: 400 });
    }

    const existing = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { client: { select: { id: true } } },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const paidAt = new Date(existing.paidAt);
    const year = paidAt.getUTCFullYear();
    const month = paidAt.getUTCMonth() + 1;

    const period = await getOrCreatePeriod(year, month);
    await assertPeriodOpen(period.id);

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          userId: user.id,
          entityType: "Payment",
          entityId: paymentId,
          action: "SOFT_DELETE",
          meta: {
            snapshot: {
              id: existing.id,
              clientId: existing.clientId,
              amount: existing.amount,
              paidAt: existing.paidAt,
              deletedAt: null,
            },
            year,
            month,
            reason,
          },
        },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          deletedAt: new Date(),
          deleteReason: reason,
          deletedById: user.id,
        },
      });
    });

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const remaining = await prisma.payment.count({
      where: {
        clientId: existing.clientId,
        deletedAt: null,
        paidAt: { gte: start, lt: end },
      },
    });

    if (remaining === 0) {
      await prisma.clientStatusByMonth.upsert({
        where: {
          clientId_billingPeriodId: {
            clientId: existing.clientId,
            billingPeriodId: period.id,
          },
        },
        update: { status: "UNPAID" },
        create: {
          clientId: existing.clientId,
          billingPeriodId: period.id,
          status: "UNPAID",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        entityType: "Payment",
        entityId: paymentId,
        action: "DELETE_REQUEST",
        meta: { clientId: existing.clientId, amount: existing.amount, year, month, remaining },
      },
    });

    logEvent({ event: "PAYMENT_DELETE", route: "/api/payments", result: "ok", paymentId, year, month, remaining });
    return NextResponse.json({ ok: true, remaining });
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err ? (err as { code?: unknown }).code : undefined;

    if (code === "BILLING_PERIOD_CLOSED") {
      logEvent({ event: "PAYMENT_DELETE", route: "/api/payments", result: "err", reason: "period_closed" });
      return NextResponse.json({ error: "Billing period is closed" }, { status: 409 });
    }

    logEvent({
      event: "PAYMENT_DELETE",
      route: "/api/payments",
      result: "err",
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
