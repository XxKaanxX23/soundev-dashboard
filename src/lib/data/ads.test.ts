import { describe, expect, it } from "vitest";
import { buildAdsDataFromRows } from "./ads";
import type { Ad, AdCampaign, AdDailyMetric, AdSet } from "@/lib/types";

const timestamp = "2026-05-17T00:00:00.000Z";

const campaign: AdCampaign = {
  id: "campaign_row",
  external_id: "campaign_meta",
  source: "meta_ads",
  name: "Cold Producers",
  status: "active",
  objective: "OUTCOME_SALES",
  created_at: timestamp,
  updated_at: timestamp,
  synced_at: timestamp,
};

const adSet: AdSet = {
  id: "adset_row",
  external_id: "adset_meta",
  source: "meta_ads",
  campaign_id: campaign.id,
  name: "US Beat Makers",
  status: "active",
  audience: "US | 18-44",
  created_at: timestamp,
  updated_at: timestamp,
  synced_at: timestamp,
};

const ad: Ad = {
  id: "ad_row",
  external_id: "ad_meta",
  source: "meta_ads",
  campaign_id: campaign.id,
  ad_set_id: adSet.id,
  name: "Workflow Hook",
  status: "active",
  creative_angle: "Fix messy drum workflow",
  utm_source: "meta",
  utm_medium: "paid_social",
  utm_campaign: "cold_producers",
  utm_content: "workflow_hook",
  utm_term: null,
  created_at: timestamp,
  updated_at: timestamp,
  synced_at: timestamp,
};

const metric: AdDailyMetric = {
  id: "metric_row",
  external_id: "ad_meta:2026-05-10",
  source: "meta_ads",
  ad_id: ad.id,
  metric_date: "2026-05-10",
  spend_cents: 10000,
  impressions: 10000,
  clicks: 250,
  purchases: 4,
  revenue_cents: 26800,
  created_at: timestamp,
  updated_at: timestamp,
  synced_at: timestamp,
};

describe("Meta Ads data layer", () => {
  it("returns live mode and real KPIs when metric joins are complete", () => {
    const result = buildAdsDataFromRows({
      campaigns: [campaign],
      adSets: [adSet],
      ads: [ad],
      metrics: [metric],
    });

    expect(result.mode).toBe("live");
    expect(result.metaAds[0]).toMatchObject({
      id: "metric_row",
      campaignId: "campaign_meta",
      adSetId: "adset_meta",
      adId: "ad_meta",
      dateStart: "2026-05-10",
      dateStop: "2026-05-10",
      campaign: "Cold Producers",
      adSet: "US Beat Makers",
      adName: "Workflow Hook",
      spend: 100,
      purchases: 4,
      revenue: 268,
      roas: 2.68,
      signal: "Winner",
    });
    expect(result.overviewMetrics).toMatchObject({
      adSpend: 100,
      purchases: 4,
      cpa: 25,
      roas: 2.68,
    });
  });

  it("returns mock mode when metric rows are empty", () => {
    const result = buildAdsDataFromRows({
      campaigns: [campaign],
      adSets: [adSet],
      ads: [ad],
      metrics: [],
    });

    expect(result.mode).toBe("mock");
  });

  it("returns partial mode while still rendering metric rows when joins are incomplete", () => {
    const result = buildAdsDataFromRows({
      campaigns: [],
      adSets: [],
      ads: [],
      metrics: [metric],
    });

    expect(result.mode).toBe("partial");
    expect(result.metaAds[0]).toMatchObject({
      campaign: "Unknown campaign",
      adSet: "Unknown ad set",
      adName: "Unknown ad",
      spend: 100,
    });
    expect(result.metaAds[0].campaign).not.toBe("Cold Producers - Drum Workflow");
    expect(result.metaAds[0].adSet).not.toBe("Lookalike Buyers");
    expect(result.metaAds[0].adName).not.toBe("Before/After Groove Reel");
  });
});
