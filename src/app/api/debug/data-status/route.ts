import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tableConfigs = [
  { name: "transactions", orderBy: "purchased_at" },
  { name: "failed_payments", orderBy: "failed_at" },
  { name: "refunds", orderBy: "refunded_at" },
  { name: "ad_daily_metrics", orderBy: "metric_date" },
  { name: "ads", orderBy: "created_at" },
  { name: "ad_sets", orderBy: "created_at" },
  { name: "ad_campaigns", orderBy: "created_at" },
  { name: "ga4_event_metrics", orderBy: "metric_date" },
  { name: "sync_runs", orderBy: "started_at" },
] as const;

type DebugClient = {
  from: (table: string) => {
    select: (
      columns?: string,
      options?: { count?: "exact"; head?: boolean },
    ) => {
      order: (
        column: string,
        options?: { ascending?: boolean },
      ) => {
        limit: (count: number) => Promise<{
          count?: number | null;
          data?: unknown[] | null;
          error?: { message?: string } | null;
        }>;
      };
    };
  };
};

function previewRow(row: unknown) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return row ?? null;
  }

  const record = row as Record<string, unknown>;

  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !key.includes("secret")),
  );
}

async function tableStatus(
  client: DebugClient,
  table: string,
  orderBy: string,
) {
  const [countResult, latestResult] = await Promise.all([
    client
      .from(table)
      .select("*", { count: "exact", head: true })
      .order(orderBy, { ascending: false })
      .limit(1),
    client
      .from(table)
      .select("*")
      .order(orderBy, { ascending: false })
      .limit(1),
  ]);

  return {
    count: countResult.count ?? 0,
    countError: countResult.error?.message ?? null,
    latestError: latestResult.error?.message ?? null,
    latestRow: previewRow(latestResult.data?.[0] ?? null),
  };
}

export async function GET() {
  const client = (getSupabaseServiceRoleClient() ??
    getSupabaseServerClient()) as DebugClient | null;

  if (!client) {
    return Response.json(
      {
        ok: false,
        error: "Supabase read client is not configured.",
      },
      { status: 503 },
    );
  }

  const entries = await Promise.all(
    tableConfigs.map(async (config) => [
      config.name,
      await tableStatus(client, config.name, config.orderBy),
    ]),
  );

  return Response.json({
    ok: true,
    client: process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "anon",
    tables: Object.fromEntries(entries),
    timestamp: new Date().toISOString(),
  });
}
