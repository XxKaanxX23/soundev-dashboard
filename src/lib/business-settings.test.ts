import { describe, expect, it } from "vitest";
import {
  BUSINESS_SETTINGS,
  calculateBlendedCpaCents,
  calculateBlendedRoas,
  calculateBreakEvenCpaCents,
  calculateDailyGoalProgress,
  calculateEstimatedFixedExpensePerPurchaseCents,
  calculateEstimatedProfitCents,
  calculateEstimatedStripeFeeCents,
} from "./business-settings";

describe("business settings", () => {
  it("locks the Phase 8 reporting defaults", () => {
    expect(BUSINESS_SETTINGS.timezone).toBe("America/Chicago");
    expect(BUSINESS_SETTINGS.defaultDateRange).toBe("last_24_hours");
    expect(BUSINESS_SETTINGS.monthlyRevenueGoalCents).toBe(3_000_000);
    expect(BUSINESS_SETTINGS.productPriceCents).toBe(6_700);
    expect(BUSINESS_SETTINGS.landingPageUrl).toBe("https://drums.soundev.shop/");
    expect(BUSINESS_SETTINGS.knownFixedExpensesTotalCents).toBe(11_700);
    expect(BUSINESS_SETTINGS.estimatedDailyFixedExpenseCents).toBe(390);
  });

  it("calculates estimated Stripe fees using 2.9% plus 30 cents", () => {
    expect(
      calculateEstimatedStripeFeeCents({
        grossRevenueCents: 6_700,
        purchases: 1,
      }),
    ).toBe(224);
  });

  it("calculates estimated profit after ad spend, estimated fees, and fixed allocation", () => {
    expect(
      calculateEstimatedProfitCents({
        stripeNetRevenueCents: 6_700,
        metaAdSpendCents: 2_500,
        estimatedStripeFeesCents: 224,
        fixedExpenseAllocationCents: 390,
      }),
    ).toBe(3_586);
  });

  it("calculates daily revenue and purchase goal progress", () => {
    expect(
      calculateDailyGoalProgress({
        revenueActualCents: 50_000,
        purchasesActual: 5,
      }),
    ).toEqual({
      revenueProgress: 0.5,
      purchaseProgress: 1 / 3,
      revenueTargetCents: 100_000,
      purchaseTarget: 15,
    });
  });

  it("calculates blended ROAS from Stripe net revenue and Meta spend", () => {
    expect(
      calculateBlendedRoas({
        stripeNetRevenueCents: 6_700,
        metaAdSpendCents: 2_500,
      }),
    ).toBeCloseTo(2.68);
  });

  it("calculates blended CPA from Meta spend and Stripe purchases", () => {
    expect(
      calculateBlendedCpaCents({
        metaAdSpendCents: 30_000,
        stripePurchases: 5,
      }),
    ).toBe(6_000);
  });

  it("calculates break-even CPA with fee, fixed expense, and refund impact", () => {
    const fixedExpensePerPurchaseCents = calculateEstimatedFixedExpensePerPurchaseCents({
      fixedExpenseAllocationCents: 390,
      purchases: 15,
    });

    expect(fixedExpensePerPurchaseCents).toBe(26);
    expect(
      calculateBreakEvenCpaCents({
        estimatedStripeFeePerPurchaseCents: 224,
        estimatedFixedExpensePerPurchaseCents: fixedExpensePerPurchaseCents,
        refundImpactPerPurchaseCents: 335,
      }),
    ).toBe(6_115);
  });
});
