import { describe, expect, it } from "vitest";
import {
  calculateBusinessMetrics,
  calculateCpa,
  calculateFailedPaymentRate,
  calculateMetricAlerts,
  calculateRefundRate,
  calculateRoas,
  calculateUtmCoverage,
} from "./metrics";

describe("dashboard metrics", () => {
  it("calculates Soundev revenue and acquisition metrics from aggregate inputs", () => {
    const metrics = calculateBusinessMetrics({
      grossRevenue: 6700,
      refunds: 2,
      adSpend: 1840,
      purchases: 100,
      leads: 860,
      failedPayments: 12,
      checkoutStarts: 146,
      productPrice: 67,
    });

    expect(metrics.netRevenue).toBe(6566);
    expect(metrics.estimatedProfit).toBe(4726);
    expect(metrics.cpa).toBe(18.4);
    expect(metrics.roas).toBeCloseTo(3.64, 2);
    expect(metrics.leadToPurchaseRate).toBeCloseTo(0.1163, 4);
    expect(metrics.refundRate).toBe(0.02);
    expect(metrics.failedPaymentRate).toBeCloseTo(0.0822, 4);
  });

  it("returns zero for rate calculations when the denominator is zero", () => {
    expect(calculateCpa(1000, 0)).toBe(0);
    expect(calculateRoas(1000, 0)).toBe(0);
    expect(calculateRefundRate(1, 0)).toBe(0);
    expect(calculateFailedPaymentRate(1, 0)).toBe(0);
  });

  it("calculates UTM coverage from successful purchases only", () => {
    const coverage = calculateUtmCoverage([
      {
        status: "succeeded",
        utmSource: "meta",
        utmCampaign: "cold",
        utmContent: "demo",
      },
      {
        status: "succeeded",
        utmSource: "instagram",
        utmCampaign: "organic",
        utmContent: "",
      },
      {
        status: "failed",
        utmSource: "",
        utmCampaign: "",
        utmContent: "",
      },
      {
        status: "refunded",
        utmSource: "email",
        utmCampaign: "launch",
        utmContent: "sequence",
      },
    ]);

    expect(coverage.trackedPurchases).toBe(1);
    expect(coverage.totalPurchases).toBe(2);
    expect(coverage.coverageRate).toBe(0.5);
  });

  it("flags business-readable warnings from metric thresholds", () => {
    const alerts = calculateMetricAlerts({
      cpa: 31,
      roas: 1.8,
      failedPaymentRate: 0.11,
      refundRate: 0.07,
      hasCreativeWinner: true,
    });

    expect(alerts.map((alert) => alert.id)).toEqual([
      "high-cpa",
      "low-roas",
      "high-failed-payment-rate",
      "high-refund-rate",
      "creative-winner",
    ]);
  });
});
