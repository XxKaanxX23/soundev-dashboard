import {
  channelRevenue,
  dataHealthItems,
  metricAlerts,
  nextActions,
  revenueTrend,
  sourceConnections,
  utmCoverage,
} from "@/lib/mock-data";
import {
  calculateBusinessMetrics,
  calculateMetricAlerts,
  calculateUtmCoverage,
} from "@/lib/metrics";
import {
  calculateBreakEvenCpa,
  calculateStripeFees,
  detectDataMismatches,
  generateRecommendations,
} from "@/lib/recommendations";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DataHealthItem, SourceConnection, StripeTransaction } from "@/lib/types";
import { combineDataModes, readRowsWithFallback, type DataMode } from "./fallback";
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

type RevenueTrendPoint = {
  date: string;
  grossRevenue: number;
  netRevenue: number;
  purchases: number;
};

type ChannelRevenuePoint = {
  channel: string;
  revenue: number;
  purchases: number;
};

function revenueDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function channelLabel(source: string) {
  if (!source.trim()) {
    return "Untracked";
  }

  return source
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildRevenueTrendFromStripe(
  rows: StripeTransaction[],
): RevenueTrendPoint[] {
  const grouped = new Map<string, RevenueTrendPoint & { timestamp: number }>();

  rows.forEach((row) => {
    if (row.status !== "succeeded" && row.status !== "refunded") {
      return;
    }

    const timestamp = new Date(row.eventTimestamp ?? row.purchaseTimestamp).getTime();

    if (Number.isNaN(timestamp)) {
      return;
    }

    const date = revenueDateLabel(row.eventTimestamp ?? row.purchaseTimestamp);
    const current =
      grouped.get(date) ??
      ({
        date,
        grossRevenue: 0,
        netRevenue: 0,
        purchases: 0,
        timestamp,
      } satisfies RevenueTrendPoint & { timestamp: number });

    if (row.status === "succeeded") {
      current.grossRevenue += row.amount;
      current.netRevenue += row.amount;
      current.purchases += 1;
    }

    if (row.status === "refunded") {
      current.netRevenue -= row.amount;
    }

    current.timestamp = Math.min(current.timestamp, timestamp);
    grouped.set(date, current);
  });

  return [...grouped.values()]
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((point) => ({
      date: point.date,
      grossRevenue: point.grossRevenue,
      netRevenue: point.netRevenue,
      purchases: point.purchases,
    }));
}

export function buildChannelRevenueFromStripe(
  rows: StripeTransaction[],
): ChannelRevenuePoint[] {
  const grouped = new Map<string, ChannelRevenuePoint>();

  rows.forEach((row) => {
    if (row.status !== "succeeded") {
      return;
    }

    const channel = channelLabel(row.utmSource);
    const current =
      grouped.get(channel) ??
      ({
        channel,
        revenue: 0,
        purchases: 0,
      } satisfies ChannelRevenuePoint);

    current.revenue += row.amount;
    current.purchases += 1;
    grouped.set(channel, current);
  });

  return [...grouped.values()].sort(
    (left, right) => right.revenue - left.revenue || left.channel.localeCompare(right.channel),
  );
}

export function selectOverviewRevenueSeries({
  revenueMode,
  stripeTransactions,
  mockRevenueTrend,
  mockChannelRevenue,
}: {
  revenueMode: DataMode;
  stripeTransactions: StripeTransaction[];
  mockRevenueTrend: RevenueTrendPoint[];
  mockChannelRevenue: ChannelRevenuePoint[];
}) {
  if (revenueMode === "mock") {
    return {
      revenueTrend: mockRevenueTrend,
      channelRevenue: mockChannelRevenue,
    };
  }

  return {
    revenueTrend: buildRevenueTrendFromStripe(stripeTransactions),
    channelRevenue: buildChannelRevenueFromStripe(stripeTransactions),
  };
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
  const metaPurchases = ads.metaAds.reduce((sum, ad) => sum + ad.purchases, 0);
  const metaRevenue = ads.metaAds.reduce((sum, ad) => sum + ad.revenue, 0);
  const liveUtmCoverage = calculateUtmCoverage(
    revenue.stripeTransactions.map((transaction) => ({
      status: transaction.status,
      utmSource: transaction.utmSource,
      utmCampaign: transaction.utmCampaign,
      utmContent: transaction.utmContent,
    })),
  );
  const overviewMetrics = calculateBusinessMetrics({
    grossRevenue: revenue.overviewMetrics.grossRevenue,
    refunds: revenue.dashboardSnapshot.refunds,
    adSpend: totalAdSpend,
    purchases: revenue.dashboardSnapshot.successfulPurchases,
    leads: funnel.dashboardSnapshot.leads,
    failedPayments: revenue.dashboardSnapshot.failedPayments,
    checkoutStarts: revenue.dashboardSnapshot.checkoutStarts,
  });
  const stripeFees = calculateStripeFees({
    grossRevenue: overviewMetrics.grossRevenue,
    purchases: overviewMetrics.purchases,
  });
  const breakEvenCPA = calculateBreakEvenCpa({
    productPrice: 67,
    stripeFeePerPurchase:
      overviewMetrics.purchases === 0 ? 2.25 : stripeFees / overviewMetrics.purchases,
  });
  const estimatedProfit =
    overviewMetrics.netRevenue - overviewMetrics.adSpend - stripeFees;
  const mismatchWarnings = detectDataMismatches({
    metaPurchases,
    stripePurchases: overviewMetrics.purchases,
    metaRevenue,
    stripeRevenue: overviewMetrics.grossRevenue,
    utmCoverageRate:
      revenue.mode === "mock" ? utmCoverage.coverageRate : liveUtmCoverage.coverageRate,
  });
  const promisingAds = ads.metaAds.filter((ad) =>
    ["Winner", "Promising"].includes(ad.signal ?? ""),
  ).length;
  const losingAds = ads.metaAds.filter((ad) => ad.signal === "Losing").length;
  const generatedRecommendations = generateRecommendations({
    cpa: overviewMetrics.cpa,
    targetCpa: breakEvenCPA,
    roas: overviewMetrics.roas,
    refundRate: overviewMetrics.refundRate,
    failedPaymentRate: overviewMetrics.failedPaymentRate,
    mismatchWarnings,
    promisingAds,
    losingAds,
    missingMetaRevenue: metaRevenue === 0 && overviewMetrics.grossRevenue > 0,
    lowUtmCoverage:
      (revenue.mode === "mock"
        ? utmCoverage.coverageRate
        : liveUtmCoverage.coverageRate) < 0.8,
  });
  const revenueSeries = selectOverviewRevenueSeries({
    revenueMode: revenue.mode,
    stripeTransactions: revenue.stripeTransactions,
    mockRevenueTrend: revenueTrend,
    mockChannelRevenue: channelRevenue,
  });

  return {
    mode,
    overviewMetrics: {
      ...overviewMetrics,
      estimatedProfit,
    },
    stripeFees,
    breakEvenCPA,
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
          }).concat(mismatchWarnings),
    nextActions: mode === "mock" ? nextActions : generatedRecommendations,
    utmCoverage: revenue.mode === "mock" ? utmCoverage : liveUtmCoverage,
    revenueTrend: revenueSeries.revenueTrend,
    channelRevenue: revenueSeries.channelRevenue,
    dataHealthItems:
      health.mode === "mock" ? dataHealthItems : normalizeDataHealth(health.rows),
  };
}
