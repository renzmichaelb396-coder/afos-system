import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentPeriod } from "@/lib/billing/getCurrentPeriod";

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
