import { describe, expect, it } from "vitest";
import {
  buildChannelRevenueFromStripe,
  buildRevenueTrendFromStripe,
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
