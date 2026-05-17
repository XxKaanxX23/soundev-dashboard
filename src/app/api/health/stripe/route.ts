import { getDiagnosticsEnvStatus } from "@/lib/diagnostics";
import { getStripeServerClient } from "@/lib/stripe/client";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  const env = getDiagnosticsEnvStatus();

  return Response.json({
    env,
    clients: {
      supabaseAdminClientAvailable: Boolean(getSupabaseServiceRoleClient()),
      stripeClientAvailable: Boolean(getStripeServerClient()),
    },
    timestamp: new Date().toISOString(),
  });
}
