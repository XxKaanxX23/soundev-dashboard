import {
  adCampaigns as mockAdCampaigns,
  adDailyMetrics as mockAdDailyMetrics,
  adSets as mockAdSets,
  ads as mockAds,
  metaAds as mockMetaAds,
  overviewMetrics,
} from "@/lib/mock-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Ad, AdCampaign, AdDailyMetric, AdSet, MetaAd } from "@/lib/types";
import { combineDataModes, readRowsWithFallback } from "./fallback";

function dollars(cents: number) {
  return cents / 100;
}

function rate(value: number, denominator: number) {
  return denominator === 0 ? 0 : value / denominator;
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
  return metrics.map((metric) => {
    const ad = ads.find((item) => item.id === metric.ad_id);
    const adSet = adSets.find((item) => item.id === ad?.ad_set_id);
    const campaign = campaigns.find((item) => item.id === ad?.campaign_id);
    const spend = dollars(metric.spend_cents);
    const revenue = dollars(metric.revenue_cents);

    return {
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

export async function getAdsData() {
  const supabase = getSupabaseServerClient();
  const [campaigns, adSets, ads, metrics] = await Promise.all([
    readRowsWithFallback({
      source: "Ad campaigns",
      mockRows: mockAdCampaigns,
      query: async () =>
        supabase
          ? await supabase.from("ad_campaigns").select("*")
          : { data: null, error: new Error("Supabase client unavailable.") },
    }),
    readRowsWithFallback({
      source: "Ad sets",
      mockRows: mockAdSets,
      query: async () =>
        supabase
          ? await supabase.from("ad_sets").select("*")
          : { data: null, error: new Error("Supabase client unavailable.") },
    }),
    readRowsWithFallback({
      source: "Ads",
      mockRows: mockAds,
      query: async () =>
        supabase
          ? await supabase.from("ads").select("*")
          : { data: null, error: new Error("Supabase client unavailable.") },
    }),
    readRowsWithFallback({
      source: "Ad daily metrics",
      mockRows: mockAdDailyMetrics,
      query: async () =>
        supabase
          ? await supabase.from("ad_daily_metrics").select("*")
          : { data: null, error: new Error("Supabase client unavailable.") },
    }),
  ]);
  const mode = combineDataModes([
    campaigns.mode,
    adSets.mode,
    ads.mode,
    metrics.mode,
  ]);

  return {
    mode,
    metaAds:
      mode === "mock"
        ? mockMetaAds
        : normalizeAds({
            campaigns: campaigns.rows,
            adSets: adSets.rows,
            ads: ads.rows,
            metrics: metrics.rows,
          }),
    overviewMetrics,
  };
}
