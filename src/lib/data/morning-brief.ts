import {
  BUSINESS_SETTINGS,
  calculateBlendedCpaCents,
  calculateBlendedRoas,
  calculateDailyGoalProgress,
  calculateEstimatedFixedExpenseAllocationCents,
  calculateEstimatedProfitCents,
  calculateEstimatedStripeFeeCents,
} from "@/lib/business-settings";
import {
  formatDateInTimeZone,
  formatReportingWindow,
  getLast24HoursWindow,
  isTimestampInWindow,
  type ReportingWindow,
} from "@/lib/date-ranges";
import { getMissingDataDisplayState } from "@/lib/data-confidence";
import { filterDisplayableStripeRows } from "@/lib/data/revenue";
import { calculateFailedPaymentRate, calculateRefundRate, calculateUtmCoverage } from "@/lib/metrics";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AdDailyMetric,
  FailedPayment,
  Ga4EventMetric,
  GhlContact,
  Refund,
  SyncRun,
  Transaction,
} from "@/lib/types";

type HealthStatus =
  | "live"
  | "stale"
  | "failed"
  | "no_data"
  | "not_connected"
  | "healthy"
  | "partial"
  | "broken"
  | "unavailable";

type MetricStatus = "available" | "unavailable";

type MetricDisplay = {
  label: string;
  value: string;
  source: string;
  classification: "exact" | "estimated" | "directional" | "unavailable";
  status: MetricStatus;
  detail?: string;
};

type ActionItem = {
  id: string;
  title: string;
  body: string;
};

type SourceHealthItem = {
  source: string;
  status: HealthStatus;
  detail: string;
  lastSyncedAt: string | null;
};

type FunnelSnapshot = {
  metaClicks: MetricDisplay;
  landingPageViews: MetricDisplay;
  ctaClicks: MetricDisplay;
  checkoutStarts: MetricDisplay;
  purchases: MetricDisplay;
  refunds: MetricDisplay;
  leads: MetricDisplay;
};

type CashflowItem = {
  label: string;
  value: string;
  source: string;
  classification: "exact" | "estimated";
  detail?: string;
};

type SupabaseRowsResult<Row> = {
  data: Row[] | null;
  error: { message?: string } | null;
};

type MorningBriefReadClient = {
  from: <Row>(table: string) => {
    select: (columns?: string) => {
      order: (
        column: string,
        options?: { ascending?: boolean },
      ) => Promise<SupabaseRowsResult<Row>>;
    };
  };
};

export type MorningBriefMetrics = {
  grossRevenueCents: number;
  refundsCents: number;
  netRevenueCents: number;
  purchases: number;
  failedPayments: number;
  adSpendCents: number;
  adClicks: number;
  leads: number;
  landingPageViews: number;
  ctaClicks: number;
  checkoutStarts: number;
  landingPageToCtaRate: number;
  ctaToCheckoutStartRate: number;
  checkoutStartToPurchaseRate: number;
  blendedCpaCents: number;
  blendedRoas: number;
  estimatedStripeFeesCents: number;
  fixedDailySoftwareAllocationCents: number;
  estimatedProfitCents: number;
  dailyRevenueGoalProgress: number;
  dailyPurchaseGoalProgress: number;
  refundRate: number;
  failedPaymentRate: number;
  utmCoverageRate: number;
};

export type MorningBriefData = {
  window: ReportingWindow;
  reportingWindowLabel: string;
  hasAnyLiveRows: boolean;
  metrics: MorningBriefMetrics;
  topSummary: MetricDisplay[];
  summary: string;
  actionItems: ActionItem[];
  funnelSnapshot: FunnelSnapshot;
  profitCashflow: CashflowItem[];
  dataHealth: SourceHealthItem[];
  sourceFreshness: SourceHealthItem[];
  unavailableMetrics: MetricDisplay[];
};

function centsToDollars(cents: number) {
  return cents / 100;
}

function formatCurrencyCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(centsToDollars(cents));
}

function formatCurrencyCentsPrecise(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centsToDollars(cents));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatRatio(value: number) {
  return `${value.toFixed(2)}x`;
}

function availableMetric({
  label,
  value,
  source,
  classification,
  detail,
}: Omit<MetricDisplay, "status">): MetricDisplay {
  return {
    label,
    value,
    source,
    classification,
    status: "available",
    detail,
  };
}

function unavailableMetric({
  label,
  source,
  detail,
}: {
  label: string;
  source: string;
  detail: string;
}): MetricDisplay {
  return {
    label,
    value: "Unavailable",
    source,
    classification: "unavailable",
    status: "unavailable",
    detail,
  };
}

function noDataMetric({
  label,
  source,
  detail,
  classification = "exact",
}: {
  label: string;
  source: string;
  detail: string;
  classification?: MetricDisplay["classification"];
}): MetricDisplay {
  return {
    label,
    value: "No data",
    source,
    classification,
    status: "unavailable",
    detail,
  };
}

function filterMetaMetricsByWindow(
  rows: AdDailyMetric[],
  window: ReportingWindow,
) {
  const localDates = new Set([
    formatDateInTimeZone(window.start, window.timezone),
    formatDateInTimeZone(window.end, window.timezone),
  ]);

  return rows.filter((row) => localDates.has(row.metric_date));
}

function filterGa4MetricsByWindow(
  rows: Ga4EventMetric[],
  window: ReportingWindow,
) {
  const localDates = new Set([
    formatDateInTimeZone(window.start, window.timezone),
    formatDateInTimeZone(window.end, window.timezone),
  ]);

  return rows.filter((row) => localDates.has(row.metric_date));
}

function isLandingPageRow(row: Ga4EventMetric) {
  const landingUrl = BUSINESS_SETTINGS.landingPageUrl.replace(/\/$/, "");
  const pageLocation = row.page_location?.replace(/\/$/, "") ?? "";

  return (
    pageLocation === landingUrl ||
    pageLocation.startsWith(`${landingUrl}?`) ||
    row.page_path === "/" ||
    row.page_path === "/drum-mastery" ||
    row.page_path === "/drum-mastery/"
  );
}

function sumGa4Event(
  rows: Ga4EventMetric[],
  eventName: string,
  filter: (row: Ga4EventMetric) => boolean = () => true,
) {
  return rows
    .filter((row) => row.event_name === eventName && filter(row))
    .reduce((sum, row) => sum + row.event_count, 0);
}

function latestSyncRun(provider: SyncRun["provider"], rows: SyncRun[]) {
  return rows
    .filter((row) => row.provider === provider)
    .sort(
      (left, right) =>
        new Date(right.started_at).getTime() - new Date(left.started_at).getTime(),
    )[0];
}

function sourceHealth({
  source,
  liveRows,
  syncRun,
  connectionAvailable,
}: {
  source: "Stripe" | "Meta Ads" | "GoHighLevel" | "GA4";
  liveRows: number;
  syncRun?: SyncRun;
  connectionAvailable: boolean;
}): SourceHealthItem {
  if (!connectionAvailable) {
    return {
      source,
      status: "not_connected",
      detail: "Supabase credentials are not configured for live dashboard reads.",
      lastSyncedAt: null,
    };
  }

  if (syncRun?.status === "error") {
    return {
      source,
      status: "failed",
      detail: syncRun.error_message ?? `${source} latest sync failed.`,
      lastSyncedAt: syncRun.finished_at,
    };
  }

  if (liveRows > 0) {
    return {
      source,
      status: "live",
      detail: `${source} has live rows in the last 24-hour reporting window.`,
      lastSyncedAt: syncRun?.finished_at ?? null,
    };
  }

  return {
    source,
    status: "no_data",
    detail: `${source} is connected, but no rows exist in the last 24-hour reporting window.`,
    lastSyncedAt: syncRun?.finished_at ?? null,
  };
}

function utmHealth({
  purchases,
  coverageRate,
}: {
  purchases: number;
  coverageRate: number;
}): SourceHealthItem {
  if (purchases === 0) {
    return {
      source: "UTM tracking",
      status: "unavailable",
      detail: "UTM coverage is unavailable until Stripe purchases exist in the reporting window.",
      lastSyncedAt: null,
    };
  }

  if (coverageRate >= 0.8) {
    return {
      source: "UTM tracking",
      status: "healthy",
      detail: "Most Stripe purchases include source, campaign, and content tracking.",
      lastSyncedAt: null,
    };
  }

  if (coverageRate > 0) {
    return {
      source: "UTM tracking",
      status: "partial",
      detail: "Some Stripe purchases have UTM fields, but attribution is incomplete.",
      lastSyncedAt: null,
    };
  }

  return {
    source: "UTM tracking",
    status: "broken",
    detail:
      "Stripe purchases are live, but UTM attribution is missing. Check whether GoHighLevel passes UTM fields into Stripe metadata.",
    lastSyncedAt: null,
  };
}

export function buildMorningSummary({
  netRevenueCents,
  purchases,
  adSpendCents,
  estimatedProfitCents,
  revenueGoalProgress,
  purchaseGoalProgress,
  unavailableMetricLabels,
}: {
  netRevenueCents: number;
  purchases: number;
  adSpendCents: number;
  estimatedProfitCents: number;
  revenueGoalProgress: number;
  purchaseGoalProgress: number;
  unavailableMetricLabels: string[];
}) {
  const revenueBehindCents = Math.max(
    BUSINESS_SETTINGS.monthlyRevenueGoalCents / 30 - netRevenueCents,
    0,
  );
  const purchaseBehind = Math.max(
    Math.ceil(
      BUSINESS_SETTINGS.monthlyRevenueGoalCents /
        BUSINESS_SETTINGS.productPriceCents /
        30,
    ) - purchases,
    0,
  );
  const profitPhrase =
    estimatedProfitCents >= 0
      ? `estimated profit was ${formatCurrencyCents(estimatedProfitCents)}`
      : `estimated profit was -${formatCurrencyCents(Math.abs(estimatedProfitCents))}`;
  const pacePhrase =
    revenueGoalProgress >= 1 && purchaseGoalProgress >= 1
      ? "You are on or ahead of the daily revenue and purchase pace."
      : `You are behind the daily revenue pace by ${formatCurrencyCents(revenueBehindCents)} and behind purchase pace by ${purchaseBehind} purchases.`;
  const missing =
    unavailableMetricLabels.length > 0
      ? ` ${unavailableMetricLabels.join(", ")} ${
          unavailableMetricLabels.length === 1 ? "is" : "are"
        } unavailable because the required source is not connected or configured.`
      : "";

  return `In the last 24 hours, Soundev generated ${formatCurrencyCents(netRevenueCents)} in net revenue from ${purchases} purchase${purchases === 1 ? "" : "s"}, spent ${formatCurrencyCents(adSpendCents)} on ads, and ${profitPhrase}. ${pacePhrase}${missing}`;
}

export function buildMorningActionPlan({
  sourceIssues,
  missingLandingAnalytics,
  estimatedProfitCents,
  revenueGoalProgress,
  purchaseGoalProgress,
  refundRate,
  failedPaymentRate,
  utmStatus,
}: {
  sourceIssues: string[];
  missingLandingAnalytics: boolean;
  estimatedProfitCents: number;
  revenueGoalProgress: number;
  purchaseGoalProgress: number;
  refundRate: number;
  failedPaymentRate: number;
  utmStatus: HealthStatus;
}): ActionItem[] {
  const actions: ActionItem[] = [];

  if (sourceIssues.length > 0) {
    actions.push({
      id: "fix-source-health",
      title: "Fix source health first",
      body: sourceIssues[0],
    });
  }

  if (missingLandingAnalytics) {
    actions.push({
      id: "setup-landing-analytics",
      title: "Set up landing page analytics",
      body: "GA4 is not connected, so landing page views, CTA clicks, and verified checkout starts are unavailable.",
    });
  }

  if (estimatedProfitCents < 0) {
    actions.push({
      id: "protect-profit",
      title: "Protect profit today",
      body: "Estimated profit is negative. Use Stripe for revenue truth and avoid increasing spend until CPA and conversion data improve.",
    });
  }

  if (revenueGoalProgress < 1 || purchaseGoalProgress < 1) {
    actions.push({
      id: "recover-daily-pace",
      title: "Recover daily pace",
      body: "Revenue or purchase pace is behind the $30,000 monthly goal. Focus on verified traffic and checkout fixes before adding new experiments.",
    });
  }

  if (failedPaymentRate > 0.08) {
    actions.push({
      id: "review-failed-payments",
      title: "Review failed payments",
      body: "Failed payments are high enough to affect revenue. Check decline reasons and retry paths.",
    });
  }

  if (refundRate > 0.05) {
    actions.push({
      id: "review-refunds",
      title: "Review refund reasons",
      body: "Refund rate is above the watch line. Check expectations, onboarding, and support notes.",
    });
  }

  if (utmStatus === "broken" || utmStatus === "partial") {
    actions.push({
      id: "fix-utm-tracking",
      title: "Fix purchase attribution",
      body: "Stripe purchases are missing complete UTM metadata. Check whether GoHighLevel passes source, campaign, and content fields into Stripe.",
    });
  }

  return actions.slice(0, 5);
}

function buildTopSummary(metrics: MorningBriefMetrics) {
  return [
    availableMetric({
      label: "Net Revenue",
      value: formatCurrencyCents(metrics.netRevenueCents),
      source: "Stripe",
      classification: "exact",
      detail: "Stripe net revenue after refunds.",
    }),
    metrics.adSpendCents > 0
      ? availableMetric({
          label: "Ad Spend",
          value: formatCurrencyCents(metrics.adSpendCents),
          source: "Meta Ads",
          classification: "exact",
        })
      : noDataMetric({
          label: "Ad Spend",
          source: "Meta Ads",
          detail: "No Meta spend rows exist in the last 24-hour reporting window.",
        }),
    availableMetric({
      label: "Estimated Profit",
      value: formatCurrencyCents(metrics.estimatedProfitCents),
      source: "Stripe + Meta Ads + manual settings",
      classification: "estimated",
      detail:
        "Estimated, based on Stripe net revenue minus Meta spend minus estimated Stripe fees minus known fixed daily software allocation.",
    }),
    availableMetric({
      label: "Purchases",
      value: formatNumber(metrics.purchases),
      source: "Stripe",
      classification: "exact",
    }),
    metrics.purchases > 0 && metrics.adSpendCents > 0
      ? availableMetric({
          label: "Blended CPA",
          value: formatCurrencyCentsPrecise(metrics.blendedCpaCents),
          source: "Meta Ads + Stripe",
          classification: "directional",
          detail: "Directional blended CPA: Meta spend divided by Stripe purchases.",
        })
      : unavailableMetric({
          label: "Blended CPA",
          source: "Meta Ads + Stripe",
          detail: "Unavailable until both Meta spend and Stripe purchases exist.",
        }),
    metrics.adSpendCents > 0
      ? availableMetric({
          label: "Blended ROAS",
          value: formatRatio(metrics.blendedRoas),
          source: "Stripe + Meta Ads",
          classification: "directional",
          detail: "Directional blended ROAS: Stripe net revenue divided by Meta spend.",
        })
      : unavailableMetric({
          label: "Blended ROAS",
          source: "Stripe + Meta Ads",
          detail: "Unavailable until Meta spend exists.",
        }),
    availableMetric({
      label: "Revenue Goal Progress",
      value: formatPercent(metrics.dailyRevenueGoalProgress),
      source: "Stripe + manual settings",
      classification: "estimated",
      detail: "Progress toward the $1,000 daily revenue pace target.",
    }),
    availableMetric({
      label: "Purchase Goal Progress",
      value: formatPercent(metrics.dailyPurchaseGoalProgress),
      source: "Stripe + manual settings",
      classification: "estimated",
      detail: "Progress toward the 15-purchase daily pace target.",
    }),
  ];
}

function buildFunnelSnapshot({
  metrics,
  ga4ConnectionAvailable,
}: {
  metrics: MorningBriefMetrics;
  ga4ConnectionAvailable: boolean;
}): FunnelSnapshot {
  const landingState = getMissingDataDisplayState(
    ga4ConnectionAvailable ? "tracking_not_configured" : "not_connected",
    {
      source: "GA4",
      metricName: "Landing page views",
    },
  );
  return {
    metaClicks:
      metrics.adClicks > 0
        ? availableMetric({
            label: "Meta clicks",
            value: formatNumber(metrics.adClicks),
            source: "Meta Ads",
            classification: "exact",
          })
        : noDataMetric({
            label: "Meta clicks",
            source: "Meta Ads",
            detail: "No Meta click rows exist in the last 24-hour reporting window.",
          }),
    landingPageViews:
      metrics.landingPageViews > 0
        ? availableMetric({
            label: "Landing page views",
            value: formatNumber(metrics.landingPageViews),
            source: "GA4",
            classification: "exact",
            detail:
              "Uses landing_page_view when present, otherwise page_view filtered to the Soundev landing page.",
          })
        : unavailableMetric({
            label: "Landing page views",
            source: "GA4",
            detail: landingState.detail,
          }),
    ctaClicks:
      metrics.ctaClicks > 0
        ? availableMetric({
            label: "CTA clicks",
            value: formatNumber(metrics.ctaClicks),
            source: "GA4",
            classification: "exact",
            detail: `${formatPercent(metrics.landingPageToCtaRate)} landing page to CTA rate.`,
          })
        : unavailableMetric({
            label: "CTA clicks",
            source: "GA4",
            detail:
              "CTA clicks is unavailable because GA4 event primary_cta_click is not configured or has no data.",
          }),
    checkoutStarts:
      metrics.checkoutStarts > 0
        ? availableMetric({
            label: "Checkout starts",
            value: formatNumber(metrics.checkoutStarts),
            source: "GA4",
            classification: "exact",
            detail: `${formatPercent(metrics.ctaToCheckoutStartRate)} CTA to checkout start rate.`,
          })
        : unavailableMetric({
            label: "Checkout starts",
            source: "GA4",
            detail:
              "Checkout starts is unavailable because GA4 event checkout_start is not configured or has no data.",
          }),
    purchases: availableMetric({
      label: "Purchases",
      value: formatNumber(metrics.purchases),
      source: "Stripe",
      classification: "exact",
    }),
    refunds: availableMetric({
      label: "Refunds",
      value: formatCurrencyCents(metrics.refundsCents),
      source: "Stripe",
      classification: "exact",
      detail: `${formatPercent(metrics.refundRate)} refund rate.`,
    }),
    leads:
      metrics.leads > 0
        ? availableMetric({
            label: "Leads",
            value: formatNumber(metrics.leads),
            source: "GoHighLevel",
            classification: "exact",
          })
        : noDataMetric({
            label: "Leads",
            source: "GoHighLevel",
            detail: "No GoHighLevel contact rows exist in the last 24-hour reporting window.",
          }),
  };
}

function buildProfitCashflow(metrics: MorningBriefMetrics): CashflowItem[] {
  return [
    {
      label: "Stripe gross revenue",
      value: formatCurrencyCents(metrics.grossRevenueCents),
      source: "Stripe",
      classification: "exact",
    },
    {
      label: "Stripe refunds",
      value: formatCurrencyCents(metrics.refundsCents),
      source: "Stripe",
      classification: "exact",
    },
    {
      label: "Stripe net revenue",
      value: formatCurrencyCents(metrics.netRevenueCents),
      source: "Stripe",
      classification: "exact",
    },
    {
      label: "Meta ad spend",
      value: formatCurrencyCents(metrics.adSpendCents),
      source: "Meta Ads",
      classification: "exact",
    },
    {
      label: "Estimated Stripe fees",
      value: formatCurrencyCentsPrecise(metrics.estimatedStripeFeesCents),
      source: "Stripe estimate",
      classification: "estimated",
      detail: "Estimated using 2.9% plus $0.30 per successful transaction.",
    },
    {
      label: "Fixed daily software allocation",
      value: formatCurrencyCentsPrecise(metrics.fixedDailySoftwareAllocationCents),
      source: "Manual settings",
      classification: "estimated",
      detail: "Known fixed software only: GoHighLevel and ChatGPT.",
    },
    {
      label: "Estimated operating profit",
      value: formatCurrencyCents(metrics.estimatedProfitCents),
      source: "Stripe + Meta Ads + manual settings",
      classification: "estimated",
      detail: "Estimated, not accounting-final.",
    },
  ];
}

export function buildMorningBriefDataFromRows({
  window,
  transactions,
  refunds,
  failedPayments,
  adMetrics,
  ghlContacts,
  ga4EventMetrics = [],
  syncRuns,
  connectionAvailable = true,
  ga4ConnectionAvailable = false,
}: {
  window: ReportingWindow;
  transactions: Transaction[];
  refunds: Refund[];
  failedPayments: FailedPayment[];
  adMetrics: AdDailyMetric[];
  ghlContacts: GhlContact[];
  ga4EventMetrics?: Ga4EventMetric[];
  syncRuns: SyncRun[];
  connectionAvailable?: boolean;
  ga4ConnectionAvailable?: boolean;
}): MorningBriefData {
  const displayable = filterDisplayableStripeRows({
    transactions,
    refunds,
    failedPayments,
  });
  const transactionsInWindow = displayable.transactions.filter((row) =>
    isTimestampInWindow(row.purchased_at, window),
  );
  const refundsInWindow = displayable.refunds.filter((row) =>
    isTimestampInWindow(row.refunded_at, window),
  );
  const failedPaymentsInWindow = displayable.failedPayments.filter((row) =>
    isTimestampInWindow(row.failed_at, window),
  );
  const adMetricsInWindow = filterMetaMetricsByWindow(adMetrics, window);
  const contactsInWindow = ghlContacts.filter((row) =>
    isTimestampInWindow(row.first_seen_at, window),
  );
  const ga4MetricsInWindow = filterGa4MetricsByWindow(ga4EventMetrics, window);

  const successfulPurchases = transactionsInWindow.filter(
    (transaction) => transaction.status === "succeeded",
  );
  const grossRevenueCents = successfulPurchases.reduce(
    (sum, transaction) => sum + transaction.amount_cents,
    0,
  );
  const refundsCents = refundsInWindow.reduce(
    (sum, refund) => sum + refund.amount_cents,
    0,
  );
  const netRevenueCents = grossRevenueCents - refundsCents;
  const purchases = successfulPurchases.length;
  const failedPaymentsCount = failedPaymentsInWindow.length;
  const adSpendCents = adMetricsInWindow.reduce(
    (sum, metric) => sum + metric.spend_cents,
    0,
  );
  const adClicks = adMetricsInWindow.reduce(
    (sum, metric) => sum + metric.clicks,
    0,
  );
  const landingPageViewEventCount = sumGa4Event(
    ga4MetricsInWindow,
    "landing_page_view",
  );
  const landingPageViews =
    landingPageViewEventCount ||
    sumGa4Event(ga4MetricsInWindow, "page_view", isLandingPageRow);
  const ctaClicks = sumGa4Event(ga4MetricsInWindow, "primary_cta_click");
  const checkoutStarts = sumGa4Event(ga4MetricsInWindow, "checkout_start");
  const estimatedStripeFeesCents = calculateEstimatedStripeFeeCents({
    grossRevenueCents,
    purchases,
  });
  const fixedDailySoftwareAllocationCents =
    calculateEstimatedFixedExpenseAllocationCents();
  const estimatedProfitCents = calculateEstimatedProfitCents({
    stripeNetRevenueCents: netRevenueCents,
    metaAdSpendCents: adSpendCents,
    estimatedStripeFeesCents,
    fixedExpenseAllocationCents: fixedDailySoftwareAllocationCents,
  });
  const goalProgress = calculateDailyGoalProgress({
    revenueActualCents: netRevenueCents,
    purchasesActual: purchases,
  });
  const utmCoverage = calculateUtmCoverage(
    successfulPurchases.map((purchase) => ({
      status: purchase.status,
      utmSource: purchase.utm_source ?? undefined,
      utmCampaign: purchase.utm_campaign ?? undefined,
      utmContent: purchase.utm_content ?? undefined,
    })),
  );
  const metrics: MorningBriefMetrics = {
    grossRevenueCents,
    refundsCents,
    netRevenueCents,
    purchases,
    failedPayments: failedPaymentsCount,
    adSpendCents,
    adClicks,
    leads: contactsInWindow.length,
    landingPageViews,
    ctaClicks,
    checkoutStarts,
    landingPageToCtaRate: landingPageViews === 0 ? 0 : ctaClicks / landingPageViews,
    ctaToCheckoutStartRate: ctaClicks === 0 ? 0 : checkoutStarts / ctaClicks,
    checkoutStartToPurchaseRate:
      checkoutStarts === 0 ? 0 : purchases / checkoutStarts,
    blendedCpaCents: calculateBlendedCpaCents({
      metaAdSpendCents: adSpendCents,
      stripePurchases: purchases,
    }),
    blendedRoas: calculateBlendedRoas({
      stripeNetRevenueCents: netRevenueCents,
      metaAdSpendCents: adSpendCents,
    }),
    estimatedStripeFeesCents,
    fixedDailySoftwareAllocationCents,
    estimatedProfitCents,
    dailyRevenueGoalProgress: goalProgress.revenueProgress,
    dailyPurchaseGoalProgress: goalProgress.purchaseProgress,
    refundRate: calculateRefundRate(refundsInWindow.length, purchases),
    failedPaymentRate: calculateFailedPaymentRate(
      failedPaymentsCount,
      purchases + failedPaymentsCount,
    ),
    utmCoverageRate: utmCoverage.coverageRate,
  };
  const stripeHealth = sourceHealth({
    source: "Stripe",
    liveRows:
      transactionsInWindow.length + refundsInWindow.length + failedPaymentsInWindow.length,
    syncRun: latestSyncRun("Stripe", syncRuns),
    connectionAvailable,
  });
  const metaHealth = sourceHealth({
    source: "Meta Ads",
    liveRows: adMetricsInWindow.length,
    syncRun: latestSyncRun("Meta Ads", syncRuns),
    connectionAvailable,
  });
  const ghlHealth = sourceHealth({
    source: "GoHighLevel",
    liveRows: contactsInWindow.length,
    syncRun: latestSyncRun("GoHighLevel", syncRuns),
    connectionAvailable,
  });
  const ga4Health = sourceHealth({
    source: "GA4",
    liveRows: ga4MetricsInWindow.length,
    syncRun: latestSyncRun("GA4", syncRuns),
    connectionAvailable: ga4ConnectionAvailable,
  });
  const utmTrackingHealth = utmHealth({
    purchases,
    coverageRate: metrics.utmCoverageRate,
  });
  const dataHealth = [
    stripeHealth,
    metaHealth,
    ghlHealth,
    ga4Health,
    utmTrackingHealth,
  ];
  const sourceIssues = dataHealth
    .filter((item) => item.status === "failed")
    .map((item) => `${item.source} latest sync failed. ${item.detail}`);
  const funnelSnapshot = buildFunnelSnapshot({ metrics, ga4ConnectionAvailable });
  const unavailableMetrics = [
    funnelSnapshot.landingPageViews,
    funnelSnapshot.ctaClicks,
    funnelSnapshot.checkoutStarts,
  ].filter((metric) => metric.status === "unavailable");
  const summary = buildMorningSummary({
    netRevenueCents,
    purchases,
    adSpendCents,
    estimatedProfitCents,
    revenueGoalProgress: metrics.dailyRevenueGoalProgress,
    purchaseGoalProgress: metrics.dailyPurchaseGoalProgress,
    unavailableMetricLabels: unavailableMetrics.map((metric) => metric.label),
  });

  return {
    window,
    reportingWindowLabel: formatReportingWindow(window, window.timezone),
    hasAnyLiveRows:
      transactionsInWindow.length +
        refundsInWindow.length +
        failedPaymentsInWindow.length +
        adMetricsInWindow.length +
        contactsInWindow.length +
        ga4MetricsInWindow.length >
      0,
    metrics,
    topSummary: buildTopSummary(metrics),
    summary,
    actionItems: buildMorningActionPlan({
      sourceIssues,
      missingLandingAnalytics:
        funnelSnapshot.landingPageViews.status === "unavailable" ||
        funnelSnapshot.ctaClicks.status === "unavailable" ||
        funnelSnapshot.checkoutStarts.status === "unavailable",
      estimatedProfitCents,
      revenueGoalProgress: metrics.dailyRevenueGoalProgress,
      purchaseGoalProgress: metrics.dailyPurchaseGoalProgress,
      refundRate: metrics.refundRate,
      failedPaymentRate: metrics.failedPaymentRate,
      utmStatus: utmTrackingHealth.status,
    }),
    funnelSnapshot,
    profitCashflow: buildProfitCashflow(metrics),
    dataHealth,
    sourceFreshness: [stripeHealth, metaHealth, ghlHealth, ga4Health],
    unavailableMetrics,
  };
}

async function readRows<Row>(
  client: MorningBriefReadClient,
  table: string,
  orderColumn: string,
) {
  try {
    const { data, error } = await client
      .from<Row>(table)
      .select("*")
      .order(orderColumn, { ascending: false });

    if (error) {
      return [] as Row[];
    }

    return data ?? [];
  } catch {
    return [] as Row[];
  }
}

function hasSupabaseReadEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export async function getMorningBriefData() {
  const window = getLast24HoursWindow(BUSINESS_SETTINGS.timezone);
  const client = (getSupabaseServiceRoleClient() ??
    getSupabaseServerClient()) as MorningBriefReadClient | null;

  if (!client || !hasSupabaseReadEnv()) {
    return buildMorningBriefDataFromRows({
      window,
      transactions: [],
      refunds: [],
      failedPayments: [],
      adMetrics: [],
      ghlContacts: [],
      ga4EventMetrics: [],
      syncRuns: [],
      connectionAvailable: false,
      ga4ConnectionAvailable: false,
    });
  }

  const [
    transactions,
    failedPayments,
    refunds,
    adMetrics,
    ghlContacts,
    ga4EventMetrics,
    syncRuns,
  ] = await Promise.all([
    readRows<Transaction>(client, "transactions", "purchased_at"),
    readRows<FailedPayment>(client, "failed_payments", "failed_at"),
    readRows<Refund>(client, "refunds", "refunded_at"),
    readRows<AdDailyMetric>(client, "ad_daily_metrics", "metric_date"),
    readRows<GhlContact>(client, "ghl_contacts", "first_seen_at"),
    readRows<Ga4EventMetric>(client, "ga4_event_metrics", "metric_date"),
    readRows<SyncRun>(client, "sync_runs", "started_at"),
  ]);

  return buildMorningBriefDataFromRows({
    window,
    transactions,
    failedPayments,
    refunds,
    adMetrics,
    ghlContacts,
    ga4EventMetrics,
    syncRuns,
    ga4ConnectionAvailable: Boolean(
      process.env.GA4_PROPERTY_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    ),
  });
}
