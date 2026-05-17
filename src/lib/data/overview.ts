import {
  channelRevenue,
  dataHealthItems,
  metricAlerts,
  nextActions,
  revenueTrend,
  sourceConnections,
  utmCoverage,
} from "@/lib/mock-data";
import { calculateBusinessMetrics, calculateMetricAlerts } from "@/lib/metrics";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DataHealthItem, SourceConnection } from "@/lib/types";
import { combineDataModes, readRowsWithFallback } from "./fallback";
import { getAdsData } from "./ads";
import { getCreativeData } from "./creative";
import { getFunnelData } from "./funnel";
import { getRevenueData } from "./revenue";

function formatFreshness(value: string | null) {
  return value
    ? `Last sync: ${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))}`
    : "No live sync yet";
}

function normalizeDataHealth(rows: SourceConnection[]): DataHealthItem[] {
  return rows.map((connection) => ({
    source: `${connection.provider} data status`,
    status: connection.health,
    detail: connection.detail,
    freshness: formatFreshness(connection.last_sync_at),
  }));
}

export async function getOverviewData() {
  const supabase = getSupabaseServerClient();
  const [revenue, ads, funnel, creative, health] = await Promise.all([
    getRevenueData(),
    getAdsData(),
    getFunnelData(),
    getCreativeData(),
    readRowsWithFallback({
      source: "Source connections",
      mockRows: sourceConnections,
      query: async () =>
        supabase
          ? await supabase.from("source_connections").select("*")
          : { data: null, error: new Error("Supabase client unavailable.") },
    }),
  ]);
  const mode = combineDataModes([
    revenue.mode,
    ads.mode,
    funnel.mode,
    creative.mode,
    health.mode,
  ]);
  const totalAdSpend = ads.metaAds.reduce((sum, ad) => sum + ad.spend, 0);
  const overviewMetrics = calculateBusinessMetrics({
    grossRevenue: revenue.overviewMetrics.grossRevenue,
    refunds: revenue.dashboardSnapshot.refunds,
    adSpend: totalAdSpend,
    purchases: revenue.dashboardSnapshot.successfulPurchases,
    leads: funnel.dashboardSnapshot.leads,
    failedPayments: revenue.dashboardSnapshot.failedPayments,
    checkoutStarts: revenue.dashboardSnapshot.checkoutStarts,
  });

  return {
    mode,
    overviewMetrics,
    dashboardSnapshot: revenue.dashboardSnapshot,
    metaAds: ads.metaAds,
    metricAlerts:
      mode === "mock"
        ? metricAlerts
        : calculateMetricAlerts({
            cpa: overviewMetrics.cpa,
            roas: overviewMetrics.roas,
            failedPaymentRate: overviewMetrics.failedPaymentRate,
            refundRate: overviewMetrics.refundRate,
            hasCreativeWinner: creative.creativeIdeas.some(
              (idea) => idea.status === "winner",
            ),
          }),
    nextActions,
    utmCoverage,
    revenueTrend,
    channelRevenue,
    dataHealthItems:
      health.mode === "mock" ? dataHealthItems : normalizeDataHealth(health.rows),
  };
}
