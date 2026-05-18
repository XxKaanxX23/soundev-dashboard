import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SourceConnection, SyncRun } from "@/lib/types";

type ProviderName = SourceConnection["provider"];

type FreshnessClient = {
  from: (table: string) => {
    select: (columns?: string) => FreshnessQuery;
  };
};

type FreshnessQuery = {
  eq: (column: string, value: string) => FreshnessQuery;
  order: (column: string, options?: { ascending?: boolean }) => FreshnessQuery;
  limit: (count: number) => FreshnessQuery;
  maybeSingle: () => Promise<{
    data: SyncRun | SourceConnection | null;
    error: { message?: string } | null;
  }>;
};

function getFreshnessClient() {
  return (getSupabaseServiceRoleClient() ??
    getSupabaseServerClient()) as FreshnessClient | null;
}

function formatSyncDate(value: string | null) {
  if (!value) {
    return "No sync recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function getSourceFreshness(provider: ProviderName) {
  const client = getFreshnessClient();

  if (!client) {
    return {
      provider,
      lastSyncedAt: null,
      label: "No sync recorded",
      detail: "Supabase is not configured for this environment.",
      status: "empty" as const,
    };
  }

  const [syncRun, connection] = await Promise.all([
    client
      .from("sync_runs")
      .select("*")
      .eq("provider", provider)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("source_connections")
      .select("*")
      .eq("provider", provider)
      .limit(1)
      .maybeSingle(),
  ]);
  const sync = syncRun.error ? null : (syncRun.data as SyncRun | null);
  const source = connection.error ? null : (connection.data as SourceConnection | null);
  const lastSyncedAt = sync?.finished_at ?? source?.last_sync_at ?? null;

  return {
    provider,
    lastSyncedAt,
    label: formatSyncDate(lastSyncedAt),
    detail:
      sync?.error_message ??
      source?.detail ??
      (lastSyncedAt ? "Latest server-side sync metadata." : "No sync recorded yet."),
    status: sync?.status ?? source?.health ?? ("empty" as const),
  };
}
