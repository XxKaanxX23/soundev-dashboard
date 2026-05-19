import { syncGa4Analytics } from "@/lib/ga4/reports";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const result = await syncGa4Analytics({
    supabase: getSupabaseServiceRoleClient(),
  });

  return Response.json(result, {
    status: result.ok ? 200 : 503,
  });
}
