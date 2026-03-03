export const runtime = "nodejs";

/**
 * POST /api/reminders/trigger
 *
 * ADMIN-only endpoint that triggers the reminder send process.
 * Calls /api/reminders/send handler DIRECTLY as a module import —
 * no localhost HTTP fetch, no self-referential network call.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { Role } from "@prisma/client";
import { POST as sendReminders } from "@/app/api/reminders/send/route";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";
import { reminderParamsSchema } from "@/lib/schemas/reminders";

export async function POST(req: Request) {
  // CSRF check
  const csrfErr = validateCsrf(req);
  if (csrfErr) return csrfErr;

  // Rate limit: max 5 reminder trigger requests per IP per minute
  const rlResponse = checkRateLimit(getClientIp(req), RATE_LIMITS.reminders);
  if (rlResponse) return rlResponse;

  try {
    const auth = await requireUser({ roles: [Role.ADMIN] });
    if (auth.error) return auth.error;

    // Validate body params
    const body = await req.json().catch(() => ({}));
    const parsed = reminderParamsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { year, month } = parsed.data;

    const secret = process.env.REMINDERS_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Reminders not configured (missing REMINDERS_SECRET)" },
        { status: 501 }
      );
    }

    // Build a synthetic Request for the send handler.
    // This avoids any network call to localhost.
    const url = new URL(req.url);
    url.pathname = "/api/reminders/send";
    url.searchParams.set("year", String(year));
    url.searchParams.set("month", String(month));

    const innerReq = new Request(url.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });

    return await sendReminders(innerReq);
  } catch (err) {
    console.error("[reminders/trigger]", err);
    return NextResponse.json({ error: "Failed to trigger reminders" }, { status: 500 });
  }
}
