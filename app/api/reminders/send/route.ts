import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function buildMessage(name: string, amount: number) {
  const d = new Date().toISOString().slice(0, 10);
  return `Hi ${name},

Just a quick reminder that your monthly payment of ₱ ${amount.toLocaleString()} is still marked as UNPAID as of ${d}.

If you’ve already paid, please ignore this message and let us know so we can update our records.

Thank you!`;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.REMINDERS_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    return NextResponse.json({ error: "Missing SMTP env vars" }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const unpaid = await prisma.client.findMany({
    where: { status: "UNPAID" },
    select: { name: true, email: true, monthlyFee: true },
  });

  let sent = 0;

  for (const c of unpaid) {
    await transporter.sendMail({
      from,
      to: c.email,
      subject: "Payment reminder",
      text: buildMessage(c.name, c.monthlyFee),
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
