import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getOrCreatePeriod(year: number, month: number) {
  let period = await prisma.billingPeriod.findUnique({
    where: { year_month: { year, month } },
  });

  if (!period) {
    period = await prisma.billingPeriod.create({
      data: { year, month },
    });
  }

  return period;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

    await getOrCreatePeriod(year, month);

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const payments = await prisma.payment.findMany({
      where: {
        paidAt: { gte: start, lt: end },
      },
      orderBy: { paidAt: "desc" },
      include: {
        client: { select: { name: true } },
      },
    });

    return NextResponse.json({ year, month, payments });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientId = body?.clientId;
    const amount = body?.amount;

    const now = new Date();
    const year = Number(body?.year ?? now.getFullYear());
    const month = Number(body?.month ?? now.getMonth() + 1);

    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json({ error: "Missing or invalid clientId" }, { status: 400 });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Missing or invalid amount" }, { status: 400 });
    }

    if (!Number.isInteger(year) || year < 2000 || year > 3000) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const period = await getOrCreatePeriod(year, month);

    const paidAt = new Date(
      Date.UTC(
        year,
        month - 1,
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      )
    );

    const payment = await prisma.payment.create({
      data: { clientId, amount: Math.round(amount), paidAt },
    });

    await prisma.clientStatusByMonth.upsert({
      where: {
        clientId_billingPeriodId: {
          clientId,
          billingPeriodId: period.id,
        },
      },
      update: { status: "PAID" },
      create: {
        clientId,
        billingPeriodId: period.id,
        status: "PAID",
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Payment",
        entityId: payment.id,
        action: "CREATE",
        meta: { clientId, amount, year, month },
      },
    });

    return NextResponse.json({ ok: true, payment }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const paymentId = body?.paymentId;

    if (!paymentId || typeof paymentId !== "string") {
      return NextResponse.json({ error: "Missing or invalid paymentId" }, { status: 400 });
    }

    const existing = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const paidAt = new Date(existing.paidAt);
    const year = paidAt.getUTCFullYear();
    const month = paidAt.getUTCMonth() + 1;

    const period = await getOrCreatePeriod(year, month);

    await prisma.payment.delete({
      where: { id: paymentId },
    });

    // If no remaining payments for this client in that month, revert status
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const remaining = await prisma.payment.count({
      where: {
        clientId: existing.clientId,
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
        entityType: "Payment",
        entityId: paymentId,
        action: "DELETE",
        meta: { clientId: existing.clientId, amount: existing.amount, year, month, remaining },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
