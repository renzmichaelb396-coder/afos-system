import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

type RequireOptions = {
  roles?: Role[];
};

export async function requireUser(options?: RequireOptions) {
  const store = await cookies();
  const session = store.get("afos_session")?.value;

  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized", code: "AUTH_UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session },
  });

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized", code: "AUTH_INVALID_SESSION" },
        { status: 401 }
      ),
    };
  }

  // [S-1 HOTFIX] Block deactivated users immediately, even if they hold a valid session cookie.
  // This ensures admin deactivation takes effect without requiring the user to log out.
  if (!user.isActive) {
    return {
      error: NextResponse.json(
        {
          error: "Account deactivated. Contact your administrator.",
          code: "AUTH_ACCOUNT_DEACTIVATED",
        },
        { status: 403 }
      ),
    };
  }

  if (options?.roles && !options.roles.includes(user.role)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden", code: "RBAC_FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return { user };
}
