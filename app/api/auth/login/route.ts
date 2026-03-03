export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SESSION_COOKIE_NAME, sessionCookieOptions, buildSetCookieHeader } from "@/lib/session-cookie";
import { loginSchema } from "@/lib/schemas/auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";

export async function POST(req: Request) {
  // CSRF check
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  // Rate limit: max 10 login attempts per IP per minute
  const rlResponse = checkRateLimit(getClientIp(req), RATE_LIMITS.login);
  if (rlResponse) return rlResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });

    // Set-Cookie via raw header (curl + non-browser clients)
    res.headers.append("Set-Cookie", buildSetCookieHeader(user.id));

    // Set-Cookie via NextResponse API (browser)
    res.cookies.set(SESSION_COOKIE_NAME, user.id, sessionCookieOptions);

    return res;
  } catch (err: unknown) {
    console.error("[login]", err);

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
