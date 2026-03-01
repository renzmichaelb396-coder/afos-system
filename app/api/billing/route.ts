export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function logEvent(data: Record<string, unknown>) {
  if (process.env.LOG_EVENTS === "1") console.log(JSON.stringify({ ts: new Date().toISOString(), ...data }));
}

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
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const user = auth.user;
    if (!Number.isInteger(year) || year < 2000 || year > 3000) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const period = await getOrCreatePeriod(year, month);

      return NextResponse.json({ ok: true, periodId: period.id, year, month, isClosed: period.isClosed });
  } catch (err: any) {
    logEvent({ event: "BILLING_CLOSE", route: "/api/billing", result: "err", message: String(err?.message || err) });
    const msg = String(err?.message || err);
    if (/unauthorized|no session|invalid session|auth/i.test(msg)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to close billing period" }, { status: 500 });
  }
}
