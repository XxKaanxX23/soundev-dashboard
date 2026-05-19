export const KNOWN_FIXED_EXPENSES = [
  {
    name: "GoHighLevel",
    monthlyCostCents: 9_700,
  },
  {
    name: "ChatGPT",
    monthlyCostCents: 2_000,
  },
] as const;

export function sumFixedExpensesCents(
  expenses: readonly { monthlyCostCents: number }[] = KNOWN_FIXED_EXPENSES,
) {
  return expenses.reduce((sum, expense) => sum + expense.monthlyCostCents, 0);
}

export function calculateDailyFixedExpenseCents({
  monthlyFixedExpensesCents,
  daysInReportingMonth = 30,
}: {
  monthlyFixedExpensesCents: number;
  daysInReportingMonth?: number;
}) {
  return daysInReportingMonth <= 0
    ? 0
    : Math.round(monthlyFixedExpensesCents / daysInReportingMonth);
}

const knownFixedExpensesTotalCents = sumFixedExpensesCents();

export const BUSINESS_SETTINGS = {
  timezone: "America/Chicago",
  defaultDateRange: "last_24_hours",
  monthlyRevenueGoalCents: 3_000_000,
  productPriceCents: 6_700,
  knownFixedExpenses: KNOWN_FIXED_EXPENSES,
  knownFixedExpensesTotalCents,
  estimatedDailyFixedExpenseCents: calculateDailyFixedExpenseCents({
    monthlyFixedExpensesCents: knownFixedExpensesTotalCents,
  }),
  landingPageUrl: "https://drums.soundev.shop/",
} as const;

export const DAILY_REVENUE_TARGET_CENTS = Math.round(
  BUSINESS_SETTINGS.monthlyRevenueGoalCents / 30,
);

export const DAILY_PURCHASE_TARGET = Math.ceil(
  BUSINESS_SETTINGS.monthlyRevenueGoalCents /
    BUSINESS_SETTINGS.productPriceCents /
    30,
);

export function calculateEstimatedStripeFeeCents({
  grossRevenueCents,
  purchases,
  percentage = 0.029,
  fixedFeeCents = 30,
}: {
  grossRevenueCents: number;
  purchases: number;
  percentage?: number;
  fixedFeeCents?: number;
}) {
  return Math.round(grossRevenueCents * percentage + purchases * fixedFeeCents);
}

export function calculateEstimatedProfitCents({
  stripeNetRevenueCents,
  metaAdSpendCents,
  estimatedStripeFeesCents,
  fixedExpenseAllocationCents,
}: {
  stripeNetRevenueCents: number;
  metaAdSpendCents: number;
  estimatedStripeFeesCents: number;
  fixedExpenseAllocationCents: number;
}) {
  return (
    stripeNetRevenueCents -
    metaAdSpendCents -
    estimatedStripeFeesCents -
    fixedExpenseAllocationCents
  );
}

export function calculateDailyGoalProgress({
  revenueActualCents,
  purchasesActual,
  revenueTargetCents = DAILY_REVENUE_TARGET_CENTS,
  purchaseTarget = DAILY_PURCHASE_TARGET,
}: {
  revenueActualCents: number;
  purchasesActual: number;
  revenueTargetCents?: number;
  purchaseTarget?: number;
}) {
  return {
    revenueProgress:
      revenueTargetCents <= 0 ? 0 : revenueActualCents / revenueTargetCents,
    purchaseProgress: purchaseTarget <= 0 ? 0 : purchasesActual / purchaseTarget,
    revenueTargetCents,
    purchaseTarget,
  };
}

export function calculateBlendedRoas({
  stripeNetRevenueCents,
  metaAdSpendCents,
}: {
  stripeNetRevenueCents: number;
  metaAdSpendCents: number;
}) {
  return metaAdSpendCents <= 0 ? 0 : stripeNetRevenueCents / metaAdSpendCents;
}

export function calculateBlendedCpaCents({
  metaAdSpendCents,
  stripePurchases,
}: {
  metaAdSpendCents: number;
  stripePurchases: number;
}) {
  return stripePurchases <= 0 ? 0 : Math.round(metaAdSpendCents / stripePurchases);
}

export function calculateEstimatedFixedExpenseAllocationCents({
  reportingWindowDays = 1,
  dailyFixedExpenseCents = BUSINESS_SETTINGS.estimatedDailyFixedExpenseCents,
}: {
  reportingWindowDays?: number;
  dailyFixedExpenseCents?: number;
} = {}) {
  return Math.round(Math.max(reportingWindowDays, 0) * dailyFixedExpenseCents);
}

export function calculateEstimatedFixedExpensePerPurchaseCents({
  fixedExpenseAllocationCents,
  purchases,
}: {
  fixedExpenseAllocationCents: number;
  purchases: number;
}) {
  return purchases <= 0 ? 0 : Math.round(fixedExpenseAllocationCents / purchases);
}

export function calculateRefundImpactPerPurchaseCents({
  refundAmountCents,
  purchases,
}: {
  refundAmountCents: number;
  purchases: number;
}) {
  return purchases <= 0 ? 0 : Math.round(refundAmountCents / purchases);
}

export function calculateBreakEvenCpaCents({
  productPriceCents = BUSINESS_SETTINGS.productPriceCents,
  estimatedStripeFeePerPurchaseCents,
  estimatedFixedExpensePerPurchaseCents = 0,
  refundImpactPerPurchaseCents = 0,
}: {
  productPriceCents?: number;
  estimatedStripeFeePerPurchaseCents: number;
  estimatedFixedExpensePerPurchaseCents?: number;
  refundImpactPerPurchaseCents?: number;
}) {
  return Math.max(
    productPriceCents -
      estimatedStripeFeePerPurchaseCents -
      estimatedFixedExpensePerPurchaseCents -
      refundImpactPerPurchaseCents,
    0,
  );
}
