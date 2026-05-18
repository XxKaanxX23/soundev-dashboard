import { describe, expect, it } from "vitest";
import { buildRevenueDataFromRows, normalizeTransactions } from "./revenue";
import type { FailedPayment, Refund, Transaction } from "@/lib/types";

const baseTransaction: Transaction = {
  id: "row_1",
  external_id: "ch_1",
  source: "stripe",
  created_at: "2026-05-17T00:00:00.000Z",
  updated_at: "2026-05-17T00:00:00.000Z",
  synced_at: "2026-05-17T00:00:00.000Z",
  customer_email: "buyer@soundev.com",
  product_name: "Drum Mastery Suite",
  status: "succeeded",
  amount_cents: 6700,
  net_amount_cents: 6475,
  currency: "usd",
  purchased_at: "2026-05-17T01:30:00.000Z",
  stripe_checkout_session_id: "cs_1",
  stripe_payment_intent_id: "pi_1",
  raw_event: {},
  utm_source: "meta",
  utm_medium: "paid_social",
  utm_campaign: "cold_producers",
  utm_content: "hook_a",
  utm_term: null,
};

const baseFailedPayment: FailedPayment = {
  id: "failed_1",
  external_id: "pi_failed_1",
  source: "stripe",
  created_at: "2026-05-17T00:00:00.000Z",
  updated_at: "2026-05-17T00:00:00.000Z",
  synced_at: "2026-05-17T00:00:00.000Z",
  transaction_external_id: null,
  customer_email: "declined@soundev.com",
  product_name: "Drum Mastery Suite",
  amount_cents: 6700,
  currency: "usd",
  failed_at: "2026-05-17T02:00:00.000Z",
  failure_code: "card_declined",
  failure_message: "Your card was declined.",
  stripe_payment_intent_id: "pi_failed_1",
  raw_event: {},
  utm_source: "meta",
  utm_medium: "paid_social",
  utm_campaign: "cold_producers",
  utm_content: "failed_hook",
  utm_term: null,
};

const baseRefund: Refund = {
  id: "refund_1",
  external_id: "re_1",
  source: "stripe",
  created_at: "2026-05-17T00:00:00.000Z",
  updated_at: "2026-05-17T00:00:00.000Z",
  synced_at: "2026-05-17T00:00:00.000Z",
  transaction_external_id: "pi_1",
  customer_email: "buyer@soundev.com",
  product_name: "Drum Mastery Suite",
  amount_cents: 6700,
  currency: "usd",
  refunded_at: "2026-05-17T03:00:00.000Z",
  status: "succeeded",
  reason: "requested_by_customer",
  stripe_refund_id: "re_1",
  stripe_charge_id: "ch_1",
  stripe_payment_intent_id: "pi_1",
  raw_event: {},
};

describe("revenue normalization", () => {
  it("normalizes transaction rows into dashboard transaction data", () => {
    expect(normalizeTransactions([baseTransaction])).toEqual([
      expect.objectContaining({
        id: "ch_1",
        customerEmail: "buyer@soundev.com",
        productName: "Drum Mastery Suite",
        amount: 67,
        netAmount: 64.75,
        utmSource: "meta",
        utmCampaign: "cold_producers",
        utmContent: "hook_a",
      }),
    ]);
  });

  it("returns live mode and aggregates live Stripe tables", () => {
    const result = buildRevenueDataFromRows({
      transactions: [baseTransaction],
      failedPayments: [baseFailedPayment],
      refunds: [baseRefund],
    });

    expect(result.mode).toBe("live");
    expect(result.dashboardSnapshot).toMatchObject({
      successfulPurchases: 1,
      failedPayments: 1,
      refunds: 1,
      checkoutStarts: 2,
      averageOrderValue: 67,
    });
    expect(result.overviewMetrics).toMatchObject({
      grossRevenue: 67,
      netRevenue: 0,
      purchases: 1,
      failedPayments: 1,
      refunds: 1,
      refundAmount: 67,
      refundRate: 1,
      failedPaymentRate: 0.5,
    });
    expect(result.stripeTransactions.map((row) => row.status)).toEqual([
      "refunded",
      "failed",
      "succeeded",
    ]);
  });

  it("returns live mode when transactions exist without refunds or failed payments", () => {
    const result = buildRevenueDataFromRows({
      transactions: [baseTransaction],
      failedPayments: [],
      refunds: [],
    });

    expect(result.mode).toBe("live");
    expect(result.dashboardSnapshot).toMatchObject({
      successfulPurchases: 1,
      failedPayments: 0,
      refunds: 0,
    });
  });

  it("returns partial mode when only refunds exist", () => {
    const result = buildRevenueDataFromRows({
      transactions: [],
      failedPayments: [],
      refunds: [baseRefund],
    });

    expect(result.mode).toBe("partial");
    expect(result.dashboardSnapshot.refunds).toBe(1);
    expect(result.stripeTransactions[0]).toMatchObject({
      status: "refunded",
      amount: 67,
      netAmount: -67,
    });
  });

  it("returns mock mode when all live Stripe tables are empty", () => {
    const result = buildRevenueDataFromRows({
      transactions: [],
      failedPayments: [],
      refunds: [],
    });

    expect(result.mode).toBe("mock");
  });
});
