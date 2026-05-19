export type SourceSystem =
  | "stripe"
  | "meta_ads"
  | "gohighlevel"
  | "ga4"
  | "manual_settings";

export type SourceStatus = "connected" | "optional" | "future";

export type MetricClassification = "exact" | "estimated" | "directional";

export type SourceRule = {
  source: SourceSystem;
  label: string;
  status: SourceStatus;
  owns: string[];
  caveat: string;
};

export type MetricSourceRule = {
  metricId: string;
  primarySource: SourceSystem;
  secondarySource?: SourceSystem;
  classification: MetricClassification;
  displayLabel: string;
};

export const SOURCE_OF_TRUTH_BY_SOURCE: Record<SourceSystem, SourceRule> = {
  stripe: {
    source: "stripe",
    label: "Stripe",
    status: "connected",
    owns: [
      "purchases",
      "gross_revenue",
      "refunds",
      "refund_rate",
      "failed_payments",
      "failed_payment_rate",
      "net_revenue",
      "customer_payment_records",
      "payment_timestamps",
    ],
    caveat:
      "Stripe is the money source of truth, but processing fees remain estimated until balance transaction fees are synced.",
  },
  meta_ads: {
    source: "meta_ads",
    label: "Meta Ads",
    status: "connected",
    owns: [
      "ad_spend",
      "impressions",
      "reach",
      "clicks",
      "ctr",
      "cpc",
      "cpm",
      "campaign_performance",
      "adset_performance",
      "ad_performance",
      "meta_reported_purchases",
    ],
    caveat:
      "Meta purchase and revenue numbers are attribution comparison only, not money truth.",
  },
  gohighlevel: {
    source: "gohighlevel",
    label: "GoHighLevel",
    status: "connected",
    owns: [
      "leads",
      "contacts",
      "form_submissions",
      "opportunities",
      "source_fields",
      "custom_fields",
      "utm_fields",
      "funnel_records",
    ],
    caveat:
      "Do not assume GoHighLevel exposes every dashboard or funnel analytics view through the API.",
  },
  ga4: {
    source: "ga4",
    label: "GA4",
    status: "future",
    owns: [
      "landing_page_views",
      "engaged_sessions",
      "cta_clicks",
      "video_interactions",
      "checkout_starts",
      "page_behavior",
      "funnel_behavior",
    ],
    caveat:
      "GA4 is not connected yet; page behavior and event tracking metrics must be unavailable until configured.",
  },
  manual_settings: {
    source: "manual_settings",
    label: "Manual settings",
    status: "optional",
    owns: ["fixed_expenses", "manual_expenses", "product_price", "goals"],
    caveat:
      "Manual settings are source of truth for known fixed expenses until an accounting system is connected.",
  },
};

export const METRIC_SOURCE_RULES: Record<string, MetricSourceRule> = {
  gross_revenue: {
    metricId: "gross_revenue",
    primarySource: "stripe",
    classification: "exact",
    displayLabel: "Stripe gross revenue",
  },
  net_revenue: {
    metricId: "net_revenue",
    primarySource: "stripe",
    classification: "exact",
    displayLabel: "Stripe net revenue",
  },
  refunds: {
    metricId: "refunds",
    primarySource: "stripe",
    classification: "exact",
    displayLabel: "Stripe refunds",
  },
  refund_rate: {
    metricId: "refund_rate",
    primarySource: "stripe",
    classification: "exact",
    displayLabel: "Stripe refund rate",
  },
  failed_payments: {
    metricId: "failed_payments",
    primarySource: "stripe",
    classification: "exact",
    displayLabel: "Stripe failed payments",
  },
  failed_payment_rate: {
    metricId: "failed_payment_rate",
    primarySource: "stripe",
    secondarySource: "ga4",
    classification: "directional",
    displayLabel: "Failed payment rate",
  },
  purchases: {
    metricId: "purchases",
    primarySource: "stripe",
    secondarySource: "meta_ads",
    classification: "exact",
    displayLabel: "Stripe purchases",
  },
  leads: {
    metricId: "leads",
    primarySource: "gohighlevel",
    classification: "exact",
    displayLabel: "GoHighLevel leads",
  },
  landing_page_views: {
    metricId: "landing_page_views",
    primarySource: "ga4",
    classification: "exact",
    displayLabel: "GA4 landing page views",
  },
  cta_clicks: {
    metricId: "cta_clicks",
    primarySource: "ga4",
    classification: "exact",
    displayLabel: "GA4 CTA clicks",
  },
  checkout_starts: {
    metricId: "checkout_starts",
    primarySource: "ga4",
    secondarySource: "gohighlevel",
    classification: "exact",
    displayLabel: "Verified checkout starts",
  },
  checkout_conversion_rate: {
    metricId: "checkout_conversion_rate",
    primarySource: "ga4",
    secondarySource: "stripe",
    classification: "exact",
    displayLabel: "Checkout conversion rate",
  },
  lead_to_purchase_rate: {
    metricId: "lead_to_purchase_rate",
    primarySource: "gohighlevel",
    secondarySource: "stripe",
    classification: "exact",
    displayLabel: "Lead-to-purchase rate",
  },
  ad_spend: {
    metricId: "ad_spend",
    primarySource: "meta_ads",
    classification: "exact",
    displayLabel: "Meta ad spend",
  },
  cpa: {
    metricId: "cpa",
    primarySource: "meta_ads",
    secondarySource: "stripe",
    classification: "directional",
    displayLabel: "Blended CPA",
  },
  blended_roas: {
    metricId: "blended_roas",
    primarySource: "stripe",
    secondarySource: "meta_ads",
    classification: "directional",
    displayLabel: "Blended ROAS",
  },
  meta_reported_purchases: {
    metricId: "meta_reported_purchases",
    primarySource: "meta_ads",
    secondarySource: "stripe",
    classification: "directional",
    displayLabel: "Meta-reported purchases",
  },
  meta_purchase_value: {
    metricId: "meta_purchase_value",
    primarySource: "meta_ads",
    secondarySource: "stripe",
    classification: "directional",
    displayLabel: "Meta purchase value",
  },
  estimated_stripe_fees: {
    metricId: "estimated_stripe_fees",
    primarySource: "stripe",
    classification: "estimated",
    displayLabel: "Estimated Stripe fees",
  },
  fixed_daily_expense_allocation: {
    metricId: "fixed_daily_expense_allocation",
    primarySource: "manual_settings",
    classification: "estimated",
    displayLabel: "Fixed daily expense allocation",
  },
  estimated_profit: {
    metricId: "estimated_profit",
    primarySource: "stripe",
    secondarySource: "meta_ads",
    classification: "estimated",
    displayLabel: "Estimated profit",
  },
  daily_revenue_goal_progress: {
    metricId: "daily_revenue_goal_progress",
    primarySource: "manual_settings",
    secondarySource: "stripe",
    classification: "estimated",
    displayLabel: "Daily revenue goal progress",
  },
  daily_purchase_goal_progress: {
    metricId: "daily_purchase_goal_progress",
    primarySource: "manual_settings",
    secondarySource: "stripe",
    classification: "estimated",
    displayLabel: "Daily purchase goal progress",
  },
  utm_coverage: {
    metricId: "utm_coverage",
    primarySource: "stripe",
    secondarySource: "gohighlevel",
    classification: "exact",
    displayLabel: "UTM coverage",
  },
  data_freshness: {
    metricId: "data_freshness",
    primarySource: "manual_settings",
    classification: "directional",
    displayLabel: "Data freshness",
  },
  data_confidence: {
    metricId: "data_confidence",
    primarySource: "manual_settings",
    classification: "directional",
    displayLabel: "Data confidence",
  },
};

export const DASHBOARD_DATA_RULES = {
  noFakeBusinessDataInLiveUi: true,
  noSilentAssumptions: true,
  noTestCredentialsPresentedAsProductionReady: true,
  everyMetricNeedsSourceLabel: true,
  everyEstimatedMetricNeedsEstimatedLabel: true,
  everyUnavailableMetricNeedsReason: true,
  neverMixMockRowsWithLiveData: true,
  mockFallbackOnlyWhenSourceHasNoLiveRows: true,
} as const;

export function getMetricSourceRule(metricId: string) {
  return METRIC_SOURCE_RULES[metricId] ?? null;
}
