export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/schemas/projects";

export async function GET() {
  const projects = await prisma.project.findMany({
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = projectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const project = await prisma.project.create({
    data: {
      clientId: data.clientId,
      projectName: data.projectName,
      contractAmount: data.contractAmount,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: data.status,
      location: data.location ?? null,
      notes: data.notes ?? null,
    },
    include: { client: true },
  });

  return NextResponse.json({ ok: true, project }, { status: 201 });
}
