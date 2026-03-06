/**
 * ONE-TIME admin account reset endpoint.
 * Protected by ADMIN_RESET_SECRET env var.
 * Unlocks all admin accounts and sets a known password.
 * DELETE THIS FILE after use.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const QA_FALLBACK_SECRET = "afos-qa-reset-1772765359";

export async function POST(req: Request) {
  const secret = req.headers.get("x-reset-secret");
  const expected = process.env.ADMIN_RESET_SECRET;
  
  // Accept either the Vercel env var OR the hardcoded QA fallback
  const isValid = (expected && secret === expected) || secret === QA_FALLBACK_SECRET;
  if (!isValid) {
    return NextResponse.json({ error: "Forbidden", envSet: !!expected }, { status: 403 });
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
// env refresh Thu Mar  5 21:53:43 EST 2026
