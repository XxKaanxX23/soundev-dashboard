import { syncGoHighLevel } from "@/lib/ghl/sync";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const result = await syncGoHighLevel({
    supabase: getSupabaseServiceRoleClient(),
  });

  return Response.json(result, {
    status: result.ok ? 200 : 503,
  });
}
