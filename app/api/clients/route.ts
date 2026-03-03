export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { validateCsrf } from "@/lib/csrf";
import { createClientSchema } from "@/lib/schemas/clients";
import { can } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * GET /api/clients
 * GET /api/clients?year=YYYY&month=MM
 *
 * Without year+month: returns flat client list (backward-compatible).
 * With year+month: returns clients enriched with payment status for that billing period.
 *
 * [B-1 HOTFIX] Added year/month support to match frontend expectations.
 */
export async function GET(req: Request) {
  // Allow ADMIN, MANAGER, and ACCOUNTANT to view clients (matches permissions matrix)
  const auth = await requireUser({ roles: [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT] });
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const year = yearParam ? Number(yearParam) : null;
    const month = monthParam ? Number(monthParam) : null;

    // If year+month provided, enrich with billing period status
    if (year && month) {
      // Look up the billing period (may not exist yet)
      const period = await prisma.billingPeriod.findUnique({
        where: { year_month: { year, month } },
      });

      const clients = await prisma.client.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          monthlyFee: true,
          monthlyStatuses: period
            ? {
                where: { billingPeriodId: period.id },
                select: { status: true },
              }
            : false,
        },
      });

      // Flatten status onto each client for the UI
      const enriched = clients.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        monthlyFee: c.monthlyFee,
        status: c.monthlyStatuses?.[0]?.status ?? (period ? "UNPAID" : "NO_PERIOD"),
      }));

      return NextResponse.json(
        {
          ok: true,
          clients: enriched,
          year,
          month,
          periodExists: !!period,
          periodClosed: period?.isClosed ?? false,
        },
        { status: 200 }
      );
    }

    // Backward-compatible flat list (no year/month)
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, monthlyFee: true },
    });

    return NextResponse.json({ ok: true, clients }, { status: 200 });
  } catch (err) {
    logger.error("[clients:GET]", err);
    return NextResponse.json({ error: "Failed to fetch clients." }, { status: 500 });
  }
}

/**
 * POST /api/clients
 *
 * [B-2 HOTFIX] Replaced hardcoded ADMIN-only role gate with can(user, "create_client")
 * so the permissions matrix is the single source of truth.
 * ADMIN, MANAGER, and ACCOUNTANT all have create_client in the matrix.
 */
export async function POST(req: Request) {
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  // Authenticate any logged-in user first
  const auth = await requireUser();
  if (auth.error) return auth.error;

  // Then check the granular permission
  if (!can(auth.user, "create_client")) {
    return NextResponse.json(
      { error: "Forbidden", code: "PERMISSION_DENIED", required: "create_client" },
      { status: 403 }
    );
  }

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

    // Audit log preserved exactly as before
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "Client",
        entityId: created.id,
        action: "CREATE",
        meta: {
          actorUserId: auth.user.id,
          actorRole: auth.user.role,
          name: created.name,
          email: created.email,
          monthlyFee: created.monthlyFee,
        },
      },
    });

    logger.info("[clients:POST] client created", { clientId: created.id, actorId: auth.user.id });
    return NextResponse.json({ ok: true, client: created }, { status: 201 });
  } catch (err) {
    logger.error("[clients:POST]", err);
    return NextResponse.json({ error: "Failed to create client." }, { status: 500 });
  }
}
