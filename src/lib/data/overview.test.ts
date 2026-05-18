import { describe, expect, it } from "vitest";
import {
  buildDataTrustItems,
  buildChannelRevenueFromStripe,
  buildOverviewDisplayMetrics,
  buildTrustedOverviewMetrics,
  buildRevenueTrendFromStripe,
  buildUtmAttributionAlert,
  selectOverviewRevenueSeries,
} from "./overview";
import type { StripeTransaction } from "@/lib/types";

const liveRows: StripeTransaction[] = [
  {
    id: "live_purchase_1",
    status: "succeeded",
    customerEmail: "real@soundev.com",
    productName: "Drum Mastery Suite",
    purchaseTimestamp: "May 17, 09:00",
    eventTimestamp: "2026-05-17T09:00:00.000Z",
    amount: 67,
    netAmount: 64.75,
    utmSource: "meta",
    utmCampaign: "live_campaign",
    utmContent: "live_ad",
  },
  {
    id: "live_refund_1",
    status: "refunded",
    customerEmail: "real@soundev.com",
    productName: "Drum Mastery Suite",
    purchaseTimestamp: "May 17, 11:00",
    eventTimestamp: "2026-05-17T11:00:00.000Z",
    amount: 67,
    netAmount: -67,
    utmSource: "",
    utmCampaign: "",
    utmContent: "",
  },
];

describe("overview Stripe revenue series", () => {
  it("builds revenue trend from live Stripe rows without mock revenue values", () => {
    expect(buildRevenueTrendFromStripe(liveRows)).toEqual([
      { date: "May 17", grossRevenue: 67, netRevenue: 0, purchases: 1 },
    ]);
  });

  it("builds channel revenue from live Stripe rows only", () => {
    expect(buildChannelRevenueFromStripe(liveRows)).toEqual([
      { channel: "Meta", revenue: 67, purchases: 1 },
    ]);
  });

  it("does not select mock revenue series when live Stripe rows exist", () => {
    const result = selectOverviewRevenueSeries({
      revenueMode: "live",
      stripeTransactions: liveRows,
      mockRevenueTrend: [
        { date: "May 15", grossRevenue: 1139, netRevenue: 1072, purchases: 17 },
      ],
      mockChannelRevenue: [
        { channel: "Meta Ads", revenue: 6097, purchases: 91 },
      ],
    });

    expect(result.revenueTrend).toEqual([
      { date: "May 17", grossRevenue: 67, netRevenue: 0, purchases: 1 },
    ]);
    expect(result.channelRevenue).toEqual([
      { channel: "Meta", revenue: 67, purchases: 1 },
    ]);
  });

  it("returns empty live series instead of mock values when partial Stripe data has no revenue events", () => {
    const result = selectOverviewRevenueSeries({
      revenueMode: "partial",
      stripeTransactions: [
        {
          id: "failed_only",
          status: "failed",
          customerEmail: "declined@soundev.com",
          productName: "Drum Mastery Suite",
          purchaseTimestamp: "May 17, 09:00",
          eventTimestamp: "2026-05-17T09:00:00.000Z",
          amount: 67,
          netAmount: 0,
          utmSource: "meta",
          utmCampaign: "live_campaign",
          utmContent: "live_ad",
        },
      ],
      mockRevenueTrend: [
        { date: "May 15", grossRevenue: 1139, netRevenue: 1072, purchases: 17 },
      ],
      mockChannelRevenue: [
        { channel: "Meta Ads", revenue: 6097, purchases: 91 },
      ],
    });

    expect(result.revenueTrend).toEqual([]);
    expect(result.channelRevenue).toEqual([]);
  });
});

describe("overview data honesty", () => {
  it("does not expose mock lead counts when GoHighLevel is not connected", () => {
    const display = buildOverviewDisplayMetrics({
      funnelMode: "mock",
      revenueMode: "live",
      stripePaymentAttempts: 5,
      leads: 860,
      leadToPurchaseRate: 0.1,
    });

    expect(display.leads.value).toBe("Not connected");
    expect(display.leadToPurchase.value).toBe("Unavailable");
    expect(display.checkoutStarts.value).toBe("Unavailable");
    expect(display.leads.value).not.toBe("860");
  });

  it("keeps revenue and spend sourced from live Stripe and Meta data", () => {
    const metrics = buildTrustedOverviewMetrics({
      funnelMode: "mock",
      grossRevenue: 201,
      refunds: 0,
      adSpend: 75,
      purchases: 3,
      failedPayments: 1,
      stripePaymentAttempts: 4,
      funnelLeads: 860,
      funnelCheckoutStarts: 146,
    });
    const trustItems = buildDataTrustItems({
      revenueMode: "live",
      adsMode: "live",
      funnelMode: "mock",
      creativeMode: "mock",
      instagramMode: "mock",
    });

    expect(metrics.grossRevenue).toBe(201);
    expect(metrics.adSpend).toBe(75);
    expect(metrics.purchases).toBe(3);
    expect(metrics.leads).toBe(0);
    expect(metrics.checkoutStarts).toBe(4);
    expect(trustItems).toEqual([
      expect.objectContaining({ source: "Stripe", status: "live" }),
      expect.objectContaining({ source: "Meta Ads", status: "live" }),
      expect.objectContaining({ source: "GoHighLevel", status: "not-connected" }),
      expect.objectContaining({ source: "Notion", status: "not-connected" }),
      expect.objectContaining({ source: "Instagram", status: "not-connected" }),
    ]);
  });

  it("shows live GoHighLevel funnel metrics only when GHL rows exist", () => {
    const display = buildOverviewDisplayMetrics({
      funnelMode: "live",
      revenueMode: "live",
      stripePaymentAttempts: 4,
      leads: 25,
      leadToPurchaseRate: 0.12,
      checkoutStarts: 9,
    });
    const metrics = buildTrustedOverviewMetrics({
      funnelMode: "live",
      grossRevenue: 201,
      refunds: 0,
      adSpend: 75,
      purchases: 3,
      failedPayments: 1,
      stripePaymentAttempts: 4,
      funnelLeads: 25,
      funnelCheckoutStarts: 9,
    });

    expect(display.leads.value).toBe("25");
    expect(display.leadToPurchase.value).toBe("12%");
    expect(display.checkoutStarts.value).toBe("9");
    expect(metrics.leads).toBe(25);
    expect(metrics.checkoutStarts).toBe(9);
  });

  it("adds a UTM warning when live Stripe purchases have no attribution", () => {
    expect(
      buildUtmAttributionAlert({
        revenueMode: "live",
        totalPurchases: 3,
        coverageRate: 0,
      }),
    ).toEqual({
      id: "missing-stripe-utm-attribution",
      title: "Stripe UTM attribution missing",
      message:
        "Stripe purchases are live, but UTM attribution is missing. Check whether GoHighLevel passes UTM fields into Stripe metadata.",
      tone: "warning",
    });
  });

  it("does not add a UTM warning for mock Stripe data", () => {
    expect(
      buildUtmAttributionAlert({
        revenueMode: "mock",
        totalPurchases: 3,
        coverageRate: 0,
      }),
    ).toBeNull();
  });
});
