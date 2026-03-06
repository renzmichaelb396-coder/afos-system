export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { validateCsrf } from "@/lib/csrf";
import { createClientSchema, updateClientSchema } from "@/lib/schemas/clients";
import { can } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * GET /api/clients
 * GET /api/clients?year=YYYY&month=MM
 * GET /api/clients?includeDeleted=true   (ADMIN only)
 *
 * Without year+month: returns flat client list (backward-compatible).
 * With year+month: returns clients enriched with payment status for that billing period.
 * deletedAt clients are excluded by default; pass includeDeleted=true (ADMIN only) to see them.
 */
export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  if (!can(auth.user, "view_clients")) {
    return NextResponse.json({ error: "Forbidden", code: "PERMISSION_DENIED" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const year = yearParam ? Number(yearParam) : null;
    const month = monthParam ? Number(monthParam) : null;
    const includeDeleted =
      searchParams.get("includeDeleted") === "true" && auth.user.role === Role.ADMIN;

    // Base filter — exclude soft-deleted unless admin requests them
    const deletedFilter = includeDeleted ? {} : { deletedAt: null };

    if (year && month) {
      const period = await prisma.billingPeriod.findUnique({
        where: { year_month: { year, month } },
      });

      const clients = await prisma.client.findMany({
        where: deletedFilter,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          monthlyFee: true,
          deletedAt: true,
          monthlyStatuses: period
            ? {
                where: { billingPeriodId: period.id },
                select: { status: true },
              }
            : false,
        },
      });

      const enriched = clients.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        monthlyFee: c.monthlyFee,
        deletedAt: c.deletedAt ?? null,
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

    // Backward-compatible flat list
    const clients = await prisma.client.findMany({
      where: deletedFilter,
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, monthlyFee: true, deletedAt: true },
    });

    return NextResponse.json({ ok: true, clients }, { status: 200 });
  } catch (err) {
    logger.error("[clients:GET]", err);
    return NextResponse.json({ error: "Failed to fetch clients." }, { status: 500 });
  }
}

/**
 * POST /api/clients
 * Requires create_client permission.
 */
export async function POST(req: Request) {
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireUser();
  if (auth.error) return auth.error;

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

/**
 * PUT /api/clients
 * Body: { clientId, name?, email?, monthlyFee? }
 *
 * Edit an existing client's details.
 * Requires edit_client permission.
 */
export async function PUT(req: Request) {
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireUser();
  if (auth.error) return auth.error;

  if (!can(auth.user, "edit_client")) {
    return NextResponse.json(
      { error: "Forbidden", code: "PERMISSION_DENIED", required: "edit_client" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = updateClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { clientId, name, email, monthlyFee } = parsed.data;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (client.deletedAt) {
      return NextResponse.json({ error: "Cannot edit an archived client" }, { status: 409 });
    }

    // Check email uniqueness if changing email
    if (email !== undefined && email !== client.email) {
      if (email) {
        const existing = await prisma.client.findUnique({ where: { email } });
        if (existing && existing.id !== clientId) {
          return NextResponse.json({ error: "Client email already exists" }, { status: 409 });
        }
      }
    }

    const updateData: { name?: string; email?: string | null; monthlyFee?: number } = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (monthlyFee !== undefined) updateData.monthlyFee = monthlyFee;

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
      select: { id: true, name: true, email: true, monthlyFee: true, updatedAt: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "Client",
        entityId: clientId,
        action: "CLIENT_UPDATED",
        meta: {
          actorUserId: auth.user.id,
          actorRole: auth.user.role,
          changes: updateData,
          previousName: client.name,
          previousEmail: client.email,
          previousMonthlyFee: client.monthlyFee,
        },
      },
    });

    logger.info("[clients:PUT] client updated", { clientId, actorId: auth.user.id });
    return NextResponse.json({ ok: true, client: updated }, { status: 200 });
  } catch (err) {
    logger.error("[clients:PUT]", err);
    return NextResponse.json({ error: "Failed to update client." }, { status: 500 });
  }
}

/**
 * DELETE /api/clients
 * Body: { clientId: string }
 *
 * Soft delete — sets deletedAt to now(). Historical payments remain intact.
 * Requires delete_client permission.
 */
export async function DELETE(req: Request) {
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireUser();
  if (auth.error) return auth.error;

  if (!can(auth.user, "delete_client")) {
    return NextResponse.json(
      { error: "Forbidden", code: "PERMISSION_DENIED", required: "delete_client" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { clientId } = body as { clientId?: string };

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (client.deletedAt) {
      return NextResponse.json({ error: "Client is already deleted" }, { status: 409 });
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { deletedAt: new Date() },
      select: { id: true, name: true, deletedAt: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "Client",
        entityId: clientId,
        action: "CLIENT_DELETED_SOFT",
        meta: {
          actorUserId: auth.user.id,
          actorRole: auth.user.role,
          clientName: client.name,
          deletedAt: updated.deletedAt,
        },
      },
    });

    logger.info("[clients:DELETE] soft deleted", { clientId, actorId: auth.user.id });
    return NextResponse.json({ ok: true, client: updated }, { status: 200 });
  } catch (err) {
    logger.error("[clients:DELETE]", err);
    return NextResponse.json({ error: "Failed to delete client." }, { status: 500 });
  }
}

/**
 * PATCH /api/clients
 * Body: { clientId: string, action: "restore" }
 *
 * Restores a soft-deleted client. ADMIN only.
 */
export async function PATCH(req: Request) {
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireUser({ roles: [Role.ADMIN] });
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const { clientId, action } = body as { clientId?: string; action?: string };

    if (!clientId || action !== "restore") {
      return NextResponse.json(
        { error: "clientId and action='restore' are required" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (!client.deletedAt) {
      return NextResponse.json({ error: "Client is not deleted" }, { status: 409 });
    }

    const restored = await prisma.client.update({
      where: { id: clientId },
      data: { deletedAt: null },
      select: { id: true, name: true, deletedAt: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "Client",
        entityId: clientId,
        action: "CLIENT_RESTORED",
        meta: {
          actorUserId: auth.user.id,
          actorRole: auth.user.role,
          clientName: client.name,
        },
      },
    });

    logger.info("[clients:PATCH] restored", { clientId, actorId: auth.user.id });
    return NextResponse.json({ ok: true, client: restored }, { status: 200 });
  } catch (err) {
    logger.error("[clients:PATCH]", err);
    return NextResponse.json({ error: "Failed to restore client." }, { status: 500 });
  }
}
