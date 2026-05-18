import { metaAds as mockMetaAds, overviewMetrics } from "@/lib/mock-data";
import { calculateBusinessMetrics, type BusinessMetrics } from "@/lib/metrics";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Ad, AdCampaign, AdDailyMetric, AdSet, MetaAd } from "@/lib/types";
import { type DataMode, warnFallback } from "./fallback";

function dollars(cents: number) {
  return cents / 100;
}

function rate(value: number, denominator: number) {
  return denominator === 0 ? 0 : value / denominator;
}

type SupabaseRowsResult<Row> = {
  data: Row[] | null;
  error: { message?: string } | null;
};

type SupabaseQuery<Row> = {
  select: (columns?: string) => SupabaseQuery<Row>;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => Promise<SupabaseRowsResult<Row>>;
};

type MetaAdsReadClient = {
  from: <Row>(table: string) => SupabaseQuery<Row>;
};

function hasMetaAdsReadEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

function getMetaAdsReadClient() {
  return (getSupabaseServiceRoleClient() ??
    getSupabaseServerClient()) as MetaAdsReadClient | null;
}

function devLog(label: string, value: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[dashboard:meta-ads] ${label}`, value);
  }
}

export function normalizeAds({
  campaigns,
  adSets,
  ads,
  metrics,
}: {
  campaigns: AdCampaign[];
  adSets: AdSet[];
  ads: Ad[];
  metrics: AdDailyMetric[];
}): MetaAd[] {
  return metrics.map((metric, index) => {
    const ad = ads.find((item) => item.id === metric.ad_id);
    const adSet = adSets.find((item) => item.id === ad?.ad_set_id);
    const campaign = campaigns.find((item) => item.id === ad?.campaign_id);
    const spend = dollars(metric.spend_cents);
    const revenue = dollars(metric.revenue_cents);
    const campaignId = campaign?.external_id ?? ad?.campaign_id ?? "";
    const adSetId = adSet?.external_id ?? ad?.ad_set_id ?? "";
    const adId = ad?.external_id ?? metric.ad_id;
    const dateStart = metric.metric_date;
    const dateStop = metric.metric_date;
    const fallbackId =
      [adId, dateStart, dateStop, index].filter(Boolean).join("-") ||
      [campaignId, adSetId, adId, dateStart, index].filter(Boolean).join("-");

    return {
      id: metric.id || fallbackId || `${index}`,
      campaignId,
      adSetId,
      adId,
      dateStart,
      dateStop,
      campaign: campaign?.name ?? "Unknown campaign",
      adSet: adSet?.name ?? "Unknown ad set",
      adName: ad?.name ?? "Unknown ad",
      spend,
      impressions: metric.impressions,
      clicks: metric.clicks,
      ctr: rate(metric.clicks, metric.impressions),
      cpc: rate(spend, metric.clicks),
      cpm: rate(spend * 1000, metric.impressions),
      purchases: metric.purchases,
      cpa: rate(spend, metric.purchases),
      revenue,
      roas: rate(revenue, spend),
      status: ad?.status ?? "paused",
      creativeAngle: ad?.creative_angle ?? "Unknown",
    };
  });
}

function hasCompleteJoins({
  campaigns,
  adSets,
  ads,
  metrics,
}: {
  campaigns: AdCampaign[];
  adSets: AdSet[];
  ads: Ad[];
  metrics: AdDailyMetric[];
}) {
  return metrics.every((metric) => {
    const ad = ads.find((item) => item.id === metric.ad_id);
    const adSet = adSets.find((item) => item.id === ad?.ad_set_id);
    const campaign = campaigns.find((item) => item.id === ad?.campaign_id);

    return Boolean(ad && adSet && campaign);
  });
}

function buildOverviewMetrics(metaAds: MetaAd[]): BusinessMetrics {
  const adSpend = metaAds.reduce((sum, ad) => sum + ad.spend, 0);
  const purchases = metaAds.reduce((sum, ad) => sum + ad.purchases, 0);
  const grossRevenue = metaAds.reduce((sum, ad) => sum + ad.revenue, 0);

  return {
    ...calculateBusinessMetrics({
      grossRevenue,
      refunds: 0,
      adSpend,
      purchases,
      leads: 0,
      failedPayments: 0,
      checkoutStarts: purchases,
    }),
    adSpend,
    purchases,
  };
}

export function buildAdsDataFromRows({
  campaigns,
  adSets,
  ads,
  metrics,
}: {
  campaigns: AdCampaign[];
  adSets: AdSet[];
  ads: Ad[];
  metrics: AdDailyMetric[];
}): {
  mode: DataMode;
  metaAds: MetaAd[];
  overviewMetrics: BusinessMetrics;
} {
  if (metrics.length === 0) {
    return {
      mode: "mock",
      metaAds: mockMetaAds,
      overviewMetrics,
    };
  }

  const metaAds = normalizeAds({ campaigns, adSets, ads, metrics });
  const mode = hasCompleteJoins({ campaigns, adSets, ads, metrics })
    ? "live"
    : "partial";

  return {
    mode,
    metaAds,
    overviewMetrics: buildOverviewMetrics(metaAds),
  };
}

async function readOptionalRows<Row>(
  source: string,
  query: () => Promise<{ data: Row[] | null; error: { message?: string } | null }>,
) {
  try {
    const { data, error } = await query();

    if (error) {
      warnFallback(source, error.message ?? "Query failed.");
      return [];
    }

    return data ?? [];
  } catch (error) {
    warnFallback(
      source,
      error instanceof Error ? error.message : "Query threw an unknown error.",
    );
    return [];
  }
}

export async function getAdsData() {
  devLog("Supabase env present?", hasMetaAdsReadEnv());

  if (!hasMetaAdsReadEnv()) {
    warnFallback("Meta Ads", "Supabase read env vars are missing.");
    return {
      mode: "mock" as const,
      metaAds: mockMetaAds,
      overviewMetrics,
    };
  }

  const supabase = getMetaAdsReadClient();

  if (!supabase) {
    warnFallback("Meta Ads", "Supabase client unavailable.");
    return {
      mode: "mock" as const,
      metaAds: mockMetaAds,
      overviewMetrics,
    };
  }

  const metricsResult = await supabase
    .from<AdDailyMetric>("ad_daily_metrics")
    .select("*")
    .order("metric_date", { ascending: false });
  devLog("ad_daily_metrics count", metricsResult.data?.length ?? 0);
  devLog("ad_daily_metrics error", metricsResult.error ?? null);
  devLog("first ad_daily_metrics row", metricsResult.data?.[0] ?? null);

  if (metricsResult.error || !metricsResult.data || metricsResult.data.length === 0) {
    warnFallback(
      "Meta Ads",
      metricsResult.error?.message ?? "Ad daily metrics returned no rows.",
    );
    return {
      mode: "mock" as const,
      metaAds: mockMetaAds,
      overviewMetrics,
    };
  }

  const [campaigns, adSets, ads] = await Promise.all([
    readOptionalRows("Ad campaigns", async () =>
      supabase
        .from<AdCampaign>("ad_campaigns")
        .select("*")
        .order("name", { ascending: true }),
    ),
    readOptionalRows("Ad sets", async () =>
      supabase
        .from<AdSet>("ad_sets")
        .select("*")
        .order("name", { ascending: true }),
    ),
    readOptionalRows("Ads", async () =>
      supabase.from<Ad>("ads").select("*").order("name", { ascending: true }),
    ),
  ]);
  devLog("ad_campaigns count", campaigns.length);
  devLog("ad_sets count", adSets.length);
  devLog("ads count", ads.length);

  const result = buildAdsDataFromRows({
    campaigns,
    adSets,
    ads,
    metrics: metricsResult.data,
  });

  devLog("final mode returned", result.mode);
  devLog("final first table row", result.metaAds[0] ?? null);

  return result;
}
