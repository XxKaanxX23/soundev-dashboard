import { describe, expect, it, vi } from "vitest";
import {
  extractMetaPurchases,
  extractMetaRevenueCents,
  normalizeMetaInsight,
  syncMetaAds,
} from "./sync";

describe("Meta Ads sync helpers", () => {
  it("extracts purchases from supported Meta action types", () => {
    expect(
      extractMetaPurchases([
        { action_type: "link_click", value: "12" },
        { action_type: "offsite_conversion.fb_pixel_purchase", value: "2" },
        { action_type: "omni_purchase", value: "1" },
      ]),
    ).toBe(3);
  });

  it("extracts revenue cents from supported Meta action value types", () => {
    expect(
      extractMetaRevenueCents([
        { action_type: "purchase", value: "67.00" },
        { action_type: "omni_purchase", value: "134.00" },
      ]),
    ).toBe(20100);
  });

  it("normalizes Meta insight rows into dashboard metric inserts", () => {
    const normalized = normalizeMetaInsight({
      ad_id: "238_meta_ad",
      spend: "51.25",
      impressions: "10000",
      clicks: "250",
      actions: [{ action_type: "purchase", value: "3" }],
      action_values: [{ action_type: "purchase", value: "201.00" }],
      date_start: "2026-05-10",
      date_stop: "2026-05-10",
    });

    expect(normalized).toMatchObject({
      external_id: "238_meta_ad:2026-05-10",
      source: "meta_ads",
      metric_date: "2026-05-10",
      spend_cents: 5125,
      impressions: 10000,
      clicks: 250,
      purchases: 3,
      revenue_cents: 20100,
    });
  });

  it("uses purchase_roas to infer revenue when action_values are missing", () => {
    const normalized = normalizeMetaInsight({
      ad_id: "238_meta_ad",
      spend: "50.00",
      purchase_roas: [{ action_type: "purchase", value: "2.5" }],
      date_start: "2026-05-10",
    });

    expect(normalized.revenue_cents).toBe(12500);
  });

  it("fails safely when Meta env vars are missing", async () => {
    const result = await syncMetaAds({
      env: {
        META_ACCESS_TOKEN: "",
        META_AD_ACCOUNT_ID: "",
      },
      fetcher: vi.fn(),
      supabase: null,
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID.");
  });
});
