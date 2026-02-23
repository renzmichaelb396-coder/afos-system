import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth = pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/clients") ||
    pathname.startsWith("/api/payments") ||
    pathname.startsWith("/api/audit") ||
    pathname.startsWith("/api/reminders");

  if (needsAuth) {
    const session = req.cookies.get("afos_session");

    if (!session) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const user = await prisma.user.findUnique({
      where: { id: session.value },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/clients", "/api/payments", "/api/audit", "/api/reminders/:path*"],
};
