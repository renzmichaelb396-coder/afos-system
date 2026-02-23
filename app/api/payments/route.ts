import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentPeriod } from "@/lib/billing/getCurrentPeriod";

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

    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json({ error: "Missing or invalid clientId" }, { status: 400 });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Missing or invalid amount" }, { status: 400 });
    }

    const period = await getOrCreateCurrentPeriod();

    const payment = await prisma.payment.create({
      data: { clientId, amount: Math.round(amount) },
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
        meta: { clientId, amount },
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

    if (!paymentId) {
      return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
    }

    const existing = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await prisma.payment.delete({
      where: { id: paymentId },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Payment",
        entityId: paymentId,
        action: "DELETE",
        meta: { clientId: existing.clientId, amount: existing.amount },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
