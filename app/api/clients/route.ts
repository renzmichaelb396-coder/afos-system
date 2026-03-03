export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { validateCsrf } from "@/lib/csrf";
import { createClientSchema } from "@/lib/schemas/clients";

export async function GET() {
  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, monthlyFee: true },
  });

  return NextResponse.json({ ok: true, clients }, { status: 200 });
}

export async function POST(req: Request) {
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = createClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, email, monthlyFee } = parsed.data;

    if (email) {
      const exists = await prisma.client.findUnique({ where: { email } });
      if (exists) {
        return NextResponse.json({ error: "Client email already exists" }, { status: 409 });
      }
    }

    const created = await prisma.client.create({
      data: { name, email, monthlyFee },
      select: { id: true, name: true, email: true, monthlyFee: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Client",
        entityId: created.id,
        action: "CREATE",
        meta: {
          actorUserId: auth.user.id,
          name: created.name,
          email: created.email,
          monthlyFee: created.monthlyFee,
        },
      },
    });

    return NextResponse.json({ ok: true, client: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create client", detail: msg }, { status: 500 });
  }
}
