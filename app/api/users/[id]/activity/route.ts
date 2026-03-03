export const runtime = "nodejs";

/**
 * GET /api/users/[id]/activity
 * Returns audit log entries for a specific user (ADMIN only).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const { id } = await params;

    const logs = await prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ ok: true, logs }, { status: 200 });
  } catch (err) {
    logger.error("[users:activity:GET]", err);
    return NextResponse.json({ error: "Failed to fetch activity." }, { status: 500 });
  }
}
