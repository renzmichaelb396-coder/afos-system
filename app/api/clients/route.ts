export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, monthlyFee: true },
  });

  return NextResponse.json({ ok: true, clients });
}
