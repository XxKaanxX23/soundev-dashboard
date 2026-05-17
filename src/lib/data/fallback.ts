import { getSupabaseServerClient } from "@/lib/supabase/server";

export type DataMode = "mock" | "live" | "partial";

export type QueryResult<Row> = {
  data: Row[] | null;
  error: { message?: string } | Error | null;
};

export type FallbackResult<Row> = {
  rows: Row[];
  mode: Exclude<DataMode, "partial">;
  reason?: string;
};

type SupabaseReadEnv = Record<string, string | undefined>;

export function hasSupabaseReadEnv(env: SupabaseReadEnv = process.env) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function warnFallback(source: string, reason: string) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[dashboard:data] ${source} using mock fallback: ${reason}`);
  }
}

export async function readRowsWithFallback<Row>({
  source,
  mockRows,
  query,
  env = process.env,
}: {
  source: string;
  mockRows: Row[];
  query: () => Promise<QueryResult<Row>>;
  env?: SupabaseReadEnv;
}): Promise<FallbackResult<Row>> {
  if (!hasSupabaseReadEnv(env)) {
    const reason = "Supabase read env vars are missing.";
    warnFallback(source, reason);
    return { rows: mockRows, mode: "mock", reason };
  }

  try {
    const { data, error } = await query();

    if (error) {
      const reason = "message" in error && error.message ? error.message : "Query failed.";
      warnFallback(source, reason);
      return { rows: mockRows, mode: "mock", reason };
    }

    if (!data || data.length === 0) {
      const reason = `${source} returned no rows.`;
      warnFallback(source, reason);
      return { rows: mockRows, mode: "mock", reason };
    }

    return { rows: data, mode: "live" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Query threw an unknown error.";
    warnFallback(source, reason);
    return { rows: mockRows, mode: "mock", reason };
  }
}

export function combineDataModes(modes: DataMode[]): DataMode {
  if (modes.length === 0 || modes.every((mode) => mode === "mock")) {
    return "mock";
  }

  if (modes.every((mode) => mode === "live")) {
    return "live";
  }

  return "partial";
}

export async function getDashboardDataMode(): Promise<DataMode> {
  if (!hasSupabaseReadEnv()) {
    return "mock";
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return "mock";
  }

  const tables = [
    "transactions",
    "ad_daily_metrics",
    "funnel_events",
    "notion_creatives",
    "instagram_daily_metrics",
  ] as const;

  try {
    const results = await Promise.all(
      tables.map((table) => supabase.from(table).select("id").limit(1)),
    );

    const liveCount = results.filter(
      (result) => !result.error && result.data && result.data.length > 0,
    ).length;

    if (liveCount === 0) {
      return "mock";
    }

    return liveCount === tables.length ? "live" : "partial";
  } catch {
    return "mock";
  }
}
