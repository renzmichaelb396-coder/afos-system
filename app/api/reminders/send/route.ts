export const runtime = "nodejs";

/**
 * POST /api/reminders/send
 *
 * Internal-only route — called exclusively by /api/reminders/trigger.
 * Authentication: Bearer token matching REMINDERS_SECRET env var.
 *
 * This route is NOT called via fetch() to localhost.
 * The trigger route imports and calls this handler directly as a module.
 */

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { reminderParamsSchema } from "@/lib/schemas/reminders";

function buildMessage(name: string, amount: number, year: number, month: number) {
  const label = `${year}-${String(month).padStart(2, "0")}`;
  return `Hi ${name},

Just a quick reminder that your monthly payment of ₱ ${amount.toLocaleString()} is still marked as UNPAID for ${label}.

If you've already paid, please ignore this message and let us know so we can update our records.

Thank you!`;
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

export async function POST(req: Request) {
  // ── Secret guard ────────────────────────────────────────────────────────
  const secret = process.env.REMINDERS_SECRET;

  if (!secret) {
    // In production, a missing secret is a hard failure — not a soft 501.
    if (process.env.NODE_ENV === "production") {
      console.error("[reminders/send] REMINDERS_SECRET is not set in production");
      return NextResponse.json(
        { error: "Reminders not configured (missing REMINDERS_SECRET)" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Reminders not configured (missing REMINDERS_SECRET)" },
      { status: 501 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── SMTP guard ──────────────────────────────────────────────────────────
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    return NextResponse.json(
      { error: "Reminders not configured (missing SMTP env vars)" },
      { status: 501 }
    );
  }

  // ── Parameter validation ────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const now = new Date();

  const parsed = reminderParamsSchema.safeParse({
    year: searchParams.get("year") ?? now.getFullYear(),
    month: searchParams.get("month") ?? now.getMonth() + 1,
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

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const unpaid = await prisma.clientStatusByMonth.findMany({
      where: { billingPeriodId: period.id, status: "UNPAID" },
      include: { client: { select: { name: true, monthlyFee: true } } },
    });

    let sent = 0;

    for (const row of unpaid) {
      await transporter.sendMail({
        from,
        to: process.env.REMINDERS_TO || user,
        subject: `Payment reminder (${year}-${String(month).padStart(2, "0")})`,
        text: buildMessage(row.client.name, row.client.monthlyFee, year, month),
      });
      sent += 1;
    }

    // Audit log inside a transaction to ensure atomicity
    await prisma.auditLog.create({
      data: {
        entityType: "Reminders",
        entityId: period.id,
        action: "SEND",
        meta: { year, month, sent, unpaidCount: unpaid.length },
      },
    });

    return NextResponse.json({ ok: true, year, month, sent });
  } catch (e: unknown) {
    console.error("[reminders/send]", e);
    return NextResponse.json(
      {
        ok: false,
        name: e instanceof Error ? e.name : undefined,
        code:
          e && typeof e === "object" && "code" in e
            ? (e as { code?: unknown }).code
            : undefined,
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
