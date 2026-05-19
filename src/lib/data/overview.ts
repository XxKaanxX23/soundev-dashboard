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
  type BusinessMetrics,
  type MetricAlert,
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
import { getInstagramData } from "./instagram";
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

export type OverviewDisplayMetric = {
  value: string;
  source: string;
  helper: string;
};

export type OverviewDisplayMetrics = {
  leads: OverviewDisplayMetric;
  leadToPurchase: OverviewDisplayMetric;
  checkoutStarts: OverviewDisplayMetric;
};

export type DataTrustStatus = "live" | "partial" | "mock" | "not-connected";

export type DataTrustItem = {
  source: "Stripe" | "Meta Ads" | "GoHighLevel" | "Notion" | "Instagram";
  status: DataTrustStatus;
  detail: string;
};

function revenueDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatPercentValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function buildOverviewDisplayMetrics({
  funnelMode,
  stripePaymentAttempts,
  leads,
  leadToPurchaseRate,
  checkoutStarts,
}: {
  funnelMode: DataMode;
  revenueMode: DataMode;
  stripePaymentAttempts: number;
  leads: number;
  leadToPurchaseRate: number;
  checkoutStarts?: number;
}): OverviewDisplayMetrics {
  if (funnelMode === "mock") {
    const funnelHelper =
      "Funnel metrics require GoHighLevel sync. Stripe and Meta can be live while GoHighLevel remains disconnected.";

    return {
      leads: {
        value: "Not connected",
        source: "GoHighLevel, not connected",
        helper: funnelHelper,
      },
      leadToPurchase: {
        value: "Unavailable",
        source: "GoHighLevel, not connected",
        helper: funnelHelper,
      },
      checkoutStarts: {
        value: "Unavailable",
        source: "GoHighLevel, not connected",
        helper:
          stripePaymentAttempts > 0
            ? `${funnelHelper} Stripe has ${formatInteger(stripePaymentAttempts)} payment attempts, but true checkout starts need GoHighLevel.`
            : funnelHelper,
      },
    };
  }

  return {
    leads: {
      value: formatInteger(leads),
      source: "GoHighLevel",
      helper: "Lead count from live GoHighLevel funnel data.",
    },
    leadToPurchase: {
      value: formatPercentValue(leadToPurchaseRate),
      source: "GoHighLevel + Stripe",
      helper: "Live purchases divided by live GoHighLevel leads.",
    },
    checkoutStarts: {
      value: formatInteger(checkoutStarts ?? stripePaymentAttempts),
      source: "GoHighLevel",
      helper: "Checkout starts from live GoHighLevel funnel data.",
    },
  };
}

export function buildTrustedOverviewMetrics({
  funnelMode,
  grossRevenue,
  refunds,
  adSpend,
  purchases,
  failedPayments,
  stripePaymentAttempts,
  funnelLeads,
  funnelCheckoutStarts,
}: {
  funnelMode: DataMode;
  grossRevenue: number;
  refunds: number;
  adSpend: number;
  purchases: number;
  failedPayments: number;
  stripePaymentAttempts: number;
  funnelLeads: number;
  funnelCheckoutStarts: number;
}): BusinessMetrics {
  return calculateBusinessMetrics({
    grossRevenue,
    refunds,
    adSpend,
    purchases,
    leads: funnelMode === "mock" ? 0 : funnelLeads,
    failedPayments,
    checkoutStarts:
      funnelMode === "mock" ? stripePaymentAttempts : funnelCheckoutStarts,
  });
}

function trustStatusForMode(
  mode: DataMode,
  disconnectedWhenMock: boolean,
): DataTrustStatus {
  if (mode === "live") {
    return "live";
  }

  if (mode === "partial") {
    return "partial";
  }

  return disconnectedWhenMock ? "not-connected" : "mock";
}

export function buildDataTrustItems({
  revenueMode,
  adsMode,
  funnelMode,
  creativeMode,
  instagramMode,
}: {
  revenueMode: DataMode;
  adsMode: DataMode;
  funnelMode: DataMode;
  creativeMode: DataMode;
  instagramMode: DataMode;
}): DataTrustItem[] {
  return [
    {
      source: "Stripe",
      status: trustStatusForMode(revenueMode, false),
      detail:
        revenueMode === "mock"
          ? "Using demo revenue fallback because no displayable Stripe rows are available."
          : "Revenue, purchases, failed payments, and refunds come from Stripe.",
    },
    {
      source: "Meta Ads",
      status: trustStatusForMode(adsMode, false),
      detail:
        adsMode === "mock"
          ? "Using demo ad fallback because no Meta metric rows are available."
          : "Spend and ad performance come from Meta Ads sync data.",
    },
    {
      source: "GoHighLevel",
      status: trustStatusForMode(funnelMode, true),
      detail:
        funnelMode === "mock"
          ? "Not connected. Funnel lead and checkout metrics are unavailable on Overview."
          : "Funnel metrics come from GoHighLevel.",
    },
    {
      source: "Notion",
      status: trustStatusForMode(creativeMode, true),
      detail:
        creativeMode === "mock"
          ? "Not connected. Creative planning is still demo-only."
          : "Creative planning data comes from Notion.",
    },
    {
      source: "Instagram",
      status: trustStatusForMode(instagramMode, true),
      detail:
        instagramMode === "mock"
          ? "Not connected. Organic analytics are still demo-only."
          : "Organic analytics come from Instagram.",
    },
  ];
}

export function buildUtmAttributionAlert({
  revenueMode,
  totalPurchases,
  coverageRate,
}: {
  revenueMode: DataMode;
  totalPurchases: number;
  coverageRate: number;
}): MetricAlert | null {
  if (revenueMode === "mock" || totalPurchases === 0 || coverageRate > 0) {
    return null;
  }

  return {
    id: "missing-stripe-utm-attribution",
    title: "Stripe UTM attribution missing",
    message:
      "Stripe purchases are live, but UTM attribution is missing. Check whether GoHighLevel passes UTM fields into Stripe metadata.",
    tone: "warning",
  };
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
  const [revenue, ads, funnel, creative, instagram, health] = await Promise.all([
    getRevenueData(),
    getAdsData(),
    getFunnelData(),
    getCreativeData(),
    getInstagramData(),
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
    instagram.mode,
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
  const overviewMetrics = buildTrustedOverviewMetrics({
    funnelMode: funnel.mode,
    grossRevenue: revenue.overviewMetrics.grossRevenue,
    refunds: revenue.dashboardSnapshot.refunds,
    adSpend: totalAdSpend,
    purchases: revenue.dashboardSnapshot.successfulPurchases,
    failedPayments: revenue.dashboardSnapshot.failedPayments,
    stripePaymentAttempts: revenue.dashboardSnapshot.checkoutStarts,
    funnelLeads: funnel.dashboardSnapshot.leads,
    funnelCheckoutStarts: funnel.dashboardSnapshot.checkoutStarts,
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
  const utmAlert = buildUtmAttributionAlert({
    revenueMode: revenue.mode,
    totalPurchases:
      revenue.mode === "mock" ? utmCoverage.totalPurchases : liveUtmCoverage.totalPurchases,
    coverageRate:
      revenue.mode === "mock" ? utmCoverage.coverageRate : liveUtmCoverage.coverageRate,
  });
  const displayMetrics = buildOverviewDisplayMetrics({
    funnelMode: funnel.mode,
    revenueMode: revenue.mode,
    stripePaymentAttempts: revenue.dashboardSnapshot.checkoutStarts,
    leads: funnel.dashboardSnapshot.leads,
    leadToPurchaseRate: overviewMetrics.leadToPurchaseRate,
    checkoutStarts: funnel.dashboardSnapshot.checkoutStarts,
  });
  const dataTrustItems = buildDataTrustItems({
    revenueMode: revenue.mode,
    adsMode: ads.mode,
    funnelMode: funnel.mode,
    creativeMode: creative.mode,
    instagramMode: instagram.mode,
  });
  const liveMetricAlerts = calculateMetricAlerts({
    cpa: overviewMetrics.cpa,
    roas: overviewMetrics.roas,
    failedPaymentRate: overviewMetrics.failedPaymentRate,
    refundRate: overviewMetrics.refundRate,
    hasCreativeWinner:
      creative.mode !== "mock" &&
      creative.creativeIdeas.some((idea) => idea.status === "winner"),
  }).concat(mismatchWarnings);
  const trustedMetricAlerts = utmAlert ? liveMetricAlerts.concat(utmAlert) : liveMetricAlerts;

  return {
    mode,
    revenueMode: revenue.mode,
    adsMode: ads.mode,
    overviewMetrics: {
      ...overviewMetrics,
      estimatedProfit,
    },
    stripeFees,
    breakEvenCPA,
    displayMetrics,
    dataTrustItems,
    dashboardSnapshot: revenue.dashboardSnapshot,
    metaAds: ads.metaAds,
    metaRevenueWarning: ads.metaRevenueWarning,
    metricAlerts: mode === "mock" ? metricAlerts : trustedMetricAlerts,
    nextActions: mode === "mock" ? nextActions : generatedRecommendations,
    utmCoverage: revenue.mode === "mock" ? utmCoverage : liveUtmCoverage,
    revenueTrend: revenueSeries.revenueTrend,
    channelRevenue: revenueSeries.channelRevenue,
    dataHealthItems:
      health.mode === "mock" ? dataHealthItems : normalizeDataHealth(health.rows),
    stripeTransactions: revenue.stripeTransactions,
  };
}
