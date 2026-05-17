import {
  dashboardSnapshot,
  funnelEvents as mockFunnelEvents,
  funnelStages as mockFunnelStages,
  overviewMetrics,
} from "@/lib/mock-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { FunnelEvent, FunnelStage } from "@/lib/types";
import { readRowsWithFallback } from "./fallback";

function metadataNumber(event: FunnelEvent, key: string) {
  return typeof event.metadata === "object" &&
    event.metadata !== null &&
    !Array.isArray(event.metadata) &&
    typeof event.metadata[key] === "number"
    ? event.metadata[key]
    : 0;
}

export function normalizeFunnelEvents(rows: FunnelEvent[]): FunnelStage[] {
  return rows.map((event, index) => {
    const count = metadataNumber(event, "count");
    const previous = index === 0 ? count : metadataNumber(rows[index - 1], "count");

    return {
      stage: event.event_stage,
      count,
      conversionRate: index === 0 || previous === 0 ? 1 : count / previous,
      dropOff: metadataNumber(event, "drop_off"),
    };
  });
}

export async function getFunnelData() {
  const supabase = getSupabaseServerClient();
  const result = await readRowsWithFallback({
    source: "Funnel events",
    mockRows: mockFunnelEvents,
    query: async () =>
      supabase
        ? await supabase
            .from("funnel_events")
            .select("*")
            .order("occurred_at", { ascending: true })
        : { data: null, error: new Error("Supabase client unavailable.") },
  });

  return {
    mode: result.mode,
    funnelStages: result.mode === "mock" ? mockFunnelStages : normalizeFunnelEvents(result.rows),
    dashboardSnapshot,
    overviewMetrics,
  };
}
