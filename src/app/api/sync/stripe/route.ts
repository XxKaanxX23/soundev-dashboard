import { syncStripeHistory } from "@/lib/stripe/sync";
import { getStripeServerClient } from "@/lib/stripe/client";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function daysFromRequest(request: Request) {
  try {
    const body = (await request.json()) as { days?: unknown };
    const days = typeof body.days === "number" ? body.days : 90;

    return Math.min(Math.max(Math.floor(days), 1), 365);
  } catch {
    return 90;
  }
}

export async function POST(request: Request) {
  const result = await syncStripeHistory({
    stripe: getStripeServerClient(),
    supabase: getSupabaseServiceRoleClient(),
    days: await daysFromRequest(request),
  });

  return Response.json(result, {
    status: result.ok ? 200 : 503,
  });
}
