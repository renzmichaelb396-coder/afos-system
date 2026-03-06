import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";

/**
 * GET /api/auth/me
 * Returns the current authenticated user's id, email, and role.
 * Used by client components that need to conditionally render UI based on role.
 */
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  return NextResponse.json({
    id: auth.user.id,
    email: auth.user.email,
    role: auth.user.role,
  });
}
