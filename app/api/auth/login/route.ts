export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email;
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });

    // Explicit Set-Cookie header for curl + browsers (most reliable)
    res.headers.append("Set-Cookie", `afos_session=${user.id}; Path=/; HttpOnly; SameSite=Lax`);

    // Also set via NextResponse cookies API (browser-friendly)
    res.cookies.set("afos_session", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (err: unknown) {
    console.error(err);

    const meta =
      err && typeof err === "object"
        ? {
            name: "name" in err ? String((err as { name?: unknown }).name) : undefined,
            code: "code" in err ? String((err as { code?: unknown }).code) : undefined,
            message: "message" in err ? String((err as { message?: unknown }).message) : String(err),
          }
        : { message: String(err) };

    return NextResponse.json({ error: "Failed to login", ...meta }, { status: 500 });
  }
}
