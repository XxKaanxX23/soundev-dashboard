import { describe, expect, it } from "vitest";
import {
  calculateBreakEvenCpa,
  calculateStripeFees,
  classifyMetaAd,
  detectDataMismatches,
  generateRecommendations,
} from "./recommendations";

describe("dashboard recommendations", () => {
  it("calculates Stripe fees and break-even CPA", () => {
    expect(calculateStripeFees({ grossRevenue: 134, purchases: 2 })).toBeCloseTo(
      4.49,
      2,
    );
    expect(calculateBreakEvenCpa({ productPrice: 67, stripeFeePerPurchase: 2.25 }))
      .toBeCloseTo(64.75, 2);
  });

  it("detects Meta and Stripe purchase/revenue mismatches", () => {
    const warnings = detectDataMismatches({
      metaPurchases: 12,
      stripePurchases: 7,
      metaRevenue: 0,
      stripeRevenue: 469,
      utmCoverageRate: 0.42,
    });

    expect(warnings.map((warning) => warning.id)).toEqual([
      "purchase-mismatch",
      "missing-meta-revenue",
      "low-utm-coverage",
    ]);
  });

  it("classifies Meta ads using spend, purchases, CPA, and ROAS", () => {
    expect(
      classifyMetaAd({
        spend: 80,
        purchases: 0,
        cpa: 0,
        roas: 0,
        productPrice: 67,
        targetCpa: 35,
      }),
    ).toBe("Losing");
    expect(
      classifyMetaAd({
        spend: 140,
        purchases: 3,
        cpa: 30,
        roas: 2.4,
        productPrice: 67,
        targetCpa: 35,
      }),
    ).toBe("Winner");
    expect(
      classifyMetaAd({
        spend: 20,
        purchases: 0,
        cpa: 0,
        roas: 0,
        productPrice: 67,
        targetCpa: 35,
      }),
    ).toBe("No Signal Yet");
  });

  it("generates practical recommendations from business signals", () => {
    const recommendations = generateRecommendations({
      cpa: 52,
      targetCpa: 35,
      roas: 1.2,
      refundRate: 0.08,
      failedPaymentRate: 0.12,
      mismatchWarnings: [
        {
          id: "purchase-mismatch",
          title: "Meta and Stripe purchases disagree",
          message: "Mismatch",
          tone: "warning",
        },
      ],
      promisingAds: 2,
      losingAds: 3,
      missingMetaRevenue: true,
      lowUtmCoverage: true,
    });

    expect(recommendations.map((item) => item.id)).toContain("reduce-cpa");
    expect(recommendations.map((item) => item.id)).toContain("fix-attribution");
    expect(recommendations.map((item) => item.id)).toContain("scale-promising-ads");
    expect(recommendations.map((item) => item.id)).toContain("cut-losing-ads");
  });
});
