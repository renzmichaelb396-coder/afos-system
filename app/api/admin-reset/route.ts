/**
 * ONE-TIME admin account reset endpoint.
 * Protected by ADMIN_RESET_SECRET env var.
 * Unlocks all admin accounts and sets a known password.
 * DELETE THIS FILE after use.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const secret = req.headers.get("x-reset-secret");
  const expected = process.env.ADMIN_RESET_SECRET;
  
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const newPassword = body.password || "AdminReset@2026!";
  const hash = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.user.updateMany({
    where: { role: "ADMIN" },
    data: {
      password: hash,
      failedLoginCount: 0,
      lockedUntil: null,
      isActive: true,
    },
  });

  return NextResponse.json({
    ok: true,
    updated: updated.count,
    message: `Reset ${updated.count} admin account(s). Password set to: ${newPassword}`,
  });
}
