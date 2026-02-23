import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentPeriod } from "@/lib/billing/getCurrentPeriod";

export async function GET() {
  try {
    const period = await getOrCreateCurrentPeriod();

    const clients = await prisma.client.findMany({
      include: {
        monthlyStatuses: {
          where: { billingPeriodId: period.id },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ensure status row exists per client
    for (const c of clients) {
      if (c.monthlyStatuses.length === 0) {
        await prisma.clientStatusByMonth.create({
          data: {
            clientId: c.id,
            billingPeriodId: period.id,
          },
        });
      }
    }

    const refreshed = await prisma.client.findMany({
      include: {
        monthlyStatuses: {
          where: { billingPeriodId: period.id },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const shaped = refreshed.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      monthlyFee: c.monthlyFee,
      createdAt: c.createdAt,
      status: c.monthlyStatuses[0]?.status ?? "UNPAID",
    }));

    return NextResponse.json(shaped);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    const created = await prisma.client.create({
      data: {
        name: body.name,
        email: body.email ?? null,
        monthlyFee: body.monthlyFee ?? 0,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
