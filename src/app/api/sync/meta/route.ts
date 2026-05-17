import { syncMetaAds } from "@/lib/meta/sync";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const result = await syncMetaAds({
    supabase: getSupabaseServiceRoleClient(),
  });

  return Response.json(result, {
    status: result.ok ? 200 : 503,
  });
}
