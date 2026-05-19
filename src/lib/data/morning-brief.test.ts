import { describe, expect, it } from "vitest";
import type {
  AdDailyMetric,
  FailedPayment,
  GhlContact,
  Refund,
  SyncRun,
  Transaction,
} from "@/lib/types";
import {
  buildMorningActionPlan,
  buildMorningBriefDataFromRows,
  buildMorningSummary,
} from "./morning-brief";

const window = {
  timezone: "America/Chicago",
  start: new Date("2026-05-18T15:30:00.000Z"),
  end: new Date("2026-05-19T15:30:00.000Z"),
};

function transaction(
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: "txn_1",
    external_id: "pi_1",
    source: "stripe",
    created_at: "2026-05-19T12:00:00.000Z",
    updated_at: "2026-05-19T12:00:00.000Z",
    synced_at: "2026-05-19T12:00:00.000Z",
    customer_email: "customer@soundev.com",
    product_name: "Drum Mastery Suite",
    status: "succeeded",
    amount_cents: 6_700,
    net_amount_cents: 6_700,
    currency: "usd",
    purchased_at: "2026-05-19T12:00:00.000Z",
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: "pi_1",
    stripe_charge_id: "ch_1",
    payment_method_type: "card",
    utm_source: "meta",
    utm_medium: "paid",
    utm_campaign: "prospecting",
    utm_content: "hook-a",
    utm_term: null,
    raw_event: { livemode: true },
    ...overrides,
  };
}

function refund(overrides: Partial<Refund> = {}): Refund {
  return {
    id: "ref_1",
    external_id: "re_1",
    source: "stripe",
    created_at: "2026-05-19T13:00:00.000Z",
    updated_at: "2026-05-19T13:00:00.000Z",
    synced_at: "2026-05-19T13:00:00.000Z",
    transaction_external_id: "pi_1",
    customer_email: "customer@soundev.com",
    product_name: "Drum Mastery Suite",
    amount_cents: 6_700,
    currency: "usd",
    refunded_at: "2026-05-19T13:00:00.000Z",
    status: "succeeded",
    reason: "requested_by_customer",
    stripe_refund_id: "re_1",
    stripe_charge_id: "ch_1",
    stripe_payment_intent_id: "pi_1",
    raw_event: { livemode: true },
    ...overrides,
  };
}

function failedPayment(
  overrides: Partial<FailedPayment> = {},
): FailedPayment {
  return {
    id: "fail_1",
    external_id: "pi_failed",
    source: "stripe",
    created_at: "2026-05-19T11:00:00.000Z",
    updated_at: "2026-05-19T11:00:00.000Z",
    synced_at: "2026-05-19T11:00:00.000Z",
    transaction_external_id: null,
    customer_email: "buyer@soundev.com",
    product_name: "Drum Mastery Suite",
    amount_cents: 6_700,
    currency: "usd",
    failed_at: "2026-05-19T11:00:00.000Z",
    failure_code: "card_declined",
    failure_message: "Card declined",
    stripe_payment_intent_id: "pi_failed",
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    raw_event: { livemode: true },
    ...overrides,
  };
}

function adMetric(overrides: Partial<AdDailyMetric> = {}): AdDailyMetric {
  return {
    id: "metric_1",
    external_id: "metric_1",
    source: "meta_ads",
    created_at: "2026-05-19T09:00:00.000Z",
    updated_at: "2026-05-19T09:00:00.000Z",
    synced_at: "2026-05-19T09:00:00.000Z",
    ad_id: "ad_1",
    metric_date: "2026-05-19",
    spend_cents: 2_500,
    impressions: 1000,
    clicks: 40,
    purchases: 1,
    revenue_cents: 6_700,
    ...overrides,
  };
}

function contact(overrides: Partial<GhlContact> = {}): GhlContact {
  return {
    id: "contact_1",
    external_id: "contact_1",
    source: "gohighlevel",
    created_at: "2026-05-19T08:00:00.000Z",
    updated_at: "2026-05-19T08:00:00.000Z",
    synced_at: "2026-05-19T08:00:00.000Z",
    email: "lead@soundev.com",
    first_name: "Lead",
    last_name: "One",
    phone: null,
    lead_source: "Meta",
    first_seen_at: "2026-05-19T08:00:00.000Z",
    utm_source: "meta",
    utm_medium: "paid",
    utm_campaign: "prospecting",
    utm_content: "hook-a",
    utm_term: null,
    ...overrides,
  };
}

function syncRun(overrides: Partial<SyncRun> = {}): SyncRun {
  return {
    id: "sync_1",
    external_id: "sync_1",
    source: "stripe",
    created_at: "2026-05-19T14:00:00.000Z",
    updated_at: "2026-05-19T14:00:00.000Z",
    synced_at: "2026-05-19T14:00:00.000Z",
    connection_id: null,
    provider: "Stripe",
    status: "success",
    started_at: "2026-05-19T14:00:00.000Z",
    finished_at: "2026-05-19T14:01:00.000Z",
    records_processed: 2,
    error_message: null,
    ...overrides,
  };
}

describe("morning brief data", () => {
  it("calculates Stripe revenue and refunds inside the last 24 hours", () => {
    const brief = buildMorningBriefDataFromRows({
      window,
      transactions: [
        transaction({ id: "txn_1", amount_cents: 6_700 }),
        transaction({ id: "txn_2", external_id: "pi_2", amount_cents: 6_700 }),
        transaction({
          id: "outside",
          external_id: "pi_old",
          purchased_at: "2026-05-18T14:00:00.000Z",
          amount_cents: 6_700,
        }),
      ],
      refunds: [refund()],
      failedPayments: [],
      adMetrics: [],
      ghlContacts: [],
      syncRuns: [],
    });

    expect(brief.metrics.grossRevenueCents).toBe(13_400);
    expect(brief.metrics.refundsCents).toBe(6_700);
    expect(brief.metrics.netRevenueCents).toBe(6_700);
    expect(brief.metrics.purchases).toBe(2);
  });

  it("calculates estimated fees, profit, goals, CPA, and ROAS", () => {
    const brief = buildMorningBriefDataFromRows({
      window,
      transactions: [
        transaction({ id: "txn_1", amount_cents: 6_700 }),
        transaction({ id: "txn_2", external_id: "pi_2", amount_cents: 6_700 }),
      ],
      refunds: [refund()],
      failedPayments: [failedPayment()],
      adMetrics: [adMetric()],
      ghlContacts: [contact()],
      syncRuns: [],
    });

    expect(brief.metrics.estimatedStripeFeesCents).toBe(449);
    expect(brief.metrics.estimatedProfitCents).toBe(3_361);
    expect(brief.metrics.dailyRevenueGoalProgress).toBeCloseTo(0.067);
    expect(brief.metrics.dailyPurchaseGoalProgress).toBeCloseTo(2 / 15);
    expect(brief.metrics.blendedCpaCents).toBe(1_250);
    expect(brief.metrics.blendedRoas).toBeCloseTo(2.68);
    expect(brief.metrics.failedPayments).toBe(1);
    expect(brief.metrics.leads).toBe(1);
  });

  it("returns unavailable states for GA4-only funnel metrics", () => {
    const brief = buildMorningBriefDataFromRows({
      window,
      transactions: [transaction()],
      refunds: [],
      failedPayments: [],
      adMetrics: [adMetric()],
      ghlContacts: [],
      syncRuns: [],
    });

    expect(brief.funnelSnapshot.landingPageViews.status).toBe("unavailable");
    expect(brief.funnelSnapshot.landingPageViews.detail).toContain("GA4");
    expect(brief.funnelSnapshot.ctaClicks.status).toBe("unavailable");
    expect(brief.funnelSnapshot.checkoutStarts.status).toBe("unavailable");
  });

  it("writes profitable and unprofitable summaries without hiding missing data", () => {
    expect(
      buildMorningSummary({
        netRevenueCents: 20_100,
        purchases: 3,
        adSpendCents: 10_000,
        estimatedProfitCents: 8_000,
        revenueGoalProgress: 0.201,
        purchaseGoalProgress: 0.2,
        unavailableMetricLabels: ["Landing page views"],
      }),
    ).toContain("estimated profit was $80");

    expect(
      buildMorningSummary({
        netRevenueCents: 6_700,
        purchases: 1,
        adSpendCents: 10_000,
        estimatedProfitCents: -4_000,
        revenueGoalProgress: 0.067,
        purchaseGoalProgress: 1 / 15,
        unavailableMetricLabels: ["Landing page views"],
      }),
    ).toContain("estimated profit was -$40");
  });

  it("prioritizes sync/data issues before optimization advice", () => {
    const actions = buildMorningActionPlan({
      sourceIssues: ["Meta Ads latest sync failed."],
      missingLandingAnalytics: true,
      estimatedProfitCents: -4_000,
      revenueGoalProgress: 0.2,
      purchaseGoalProgress: 0.2,
      refundRate: 0,
      failedPaymentRate: 0,
      utmStatus: "broken",
    });

    expect(actions[0].title).toBe("Fix source health first");
    expect(actions[1].title).toBe("Set up landing page analytics");
  });

  it("does not use mock metrics when any live source rows exist", () => {
    const brief = buildMorningBriefDataFromRows({
      window,
      transactions: [transaction()],
      refunds: [],
      failedPayments: [],
      adMetrics: [],
      ghlContacts: [],
      syncRuns: [],
    });

    expect(brief.hasAnyLiveRows).toBe(true);
    expect(brief.topSummary.find((metric) => metric.label === "Ad Spend")?.value).toBe(
      "No data",
    );
    expect(brief.metrics.adSpendCents).toBe(0);
  });

  it("uses sync runs to report source health", () => {
    const brief = buildMorningBriefDataFromRows({
      window,
      transactions: [transaction()],
      refunds: [],
      failedPayments: [],
      adMetrics: [],
      ghlContacts: [],
      syncRuns: [
        syncRun(),
        syncRun({
          id: "meta_sync",
          provider: "Meta Ads",
          source: "meta_ads",
          status: "error",
          error_message: "Token expired",
        }),
      ],
    });

    expect(brief.dataHealth.find((item) => item.source === "Stripe")?.status).toBe(
      "live",
    );
    expect(brief.dataHealth.find((item) => item.source === "Meta Ads")?.status).toBe(
      "failed",
    );
  });
});
