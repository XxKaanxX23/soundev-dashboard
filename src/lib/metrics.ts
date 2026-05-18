export type BusinessMetricInputs = {
  grossRevenue: number;
  refunds: number;
  adSpend: number;
  purchases: number;
  leads: number;
  failedPayments: number;
  checkoutStarts: number;
  productPrice?: number;
};

export type BusinessMetrics = BusinessMetricInputs & {
  refundAmount: number;
  netRevenue: number;
  estimatedProfit: number;
  cpa: number;
  roas: number;
  leadToPurchaseRate: number;
  refundRate: number;
  failedPaymentRate: number;
};

export type UtmTrackablePurchase = {
  status: string;
  utmSource?: string;
  utmCampaign?: string;
  utmContent?: string;
};

export type UtmCoverage = {
  trackedPurchases: number;
  totalPurchases: number;
  coverageRate: number;
};

export type MetricAlertInput = {
  cpa: number;
  roas: number;
  failedPaymentRate: number;
  refundRate: number;
  hasCreativeWinner: boolean;
};

export type MetricAlert = {
  id: string;
  title: string;
  message: string;
  tone: "warning" | "danger" | "positive";
};

export function calculateCpa(adSpend: number, purchases: number) {
  return purchases === 0 ? 0 : adSpend / purchases;
}

export function calculateRoas(revenue: number, adSpend: number) {
  return adSpend === 0 ? 0 : revenue / adSpend;
}

export function calculateLeadToPurchaseRate(purchases: number, leads: number) {
  return leads === 0 ? 0 : purchases / leads;
}

export function calculateRefundRate(refunds: number, purchases: number) {
  return purchases === 0 ? 0 : refunds / purchases;
}

export function calculateFailedPaymentRate(
  failedPayments: number,
  checkoutStarts: number,
) {
  return checkoutStarts === 0 ? 0 : failedPayments / checkoutStarts;
}

export function calculateUtmCoverage(
  purchases: UtmTrackablePurchase[],
): UtmCoverage {
  const successfulPurchases = purchases.filter(
    (purchase) => purchase.status === "succeeded",
  );
  const trackedPurchases = successfulPurchases.filter(
    (purchase) =>
      Boolean(purchase.utmSource?.trim()) &&
      Boolean(purchase.utmCampaign?.trim()) &&
      Boolean(purchase.utmContent?.trim()),
  ).length;

  return {
    trackedPurchases,
    totalPurchases: successfulPurchases.length,
    coverageRate:
      successfulPurchases.length === 0
        ? 0
        : trackedPurchases / successfulPurchases.length,
  };
}

export function calculateMetricAlerts(input: MetricAlertInput): MetricAlert[] {
  const alerts: MetricAlert[] = [];

  if (input.cpa > 30) {
    alerts.push({
      id: "high-cpa",
      title: "High CPA",
      message:
        "Cost per purchase is above the $30 watch line. Scaling this traffic without a stronger offer or creative may compress profit.",
      tone: "warning",
    });
  }

  if (input.roas < 2) {
    alerts.push({
      id: "low-roas",
      title: "Low ROAS",
      message:
        "Revenue is less than 2x ad spend. Review low-performing campaigns before increasing budget.",
      tone: "danger",
    });
  }

  if (input.failedPaymentRate > 0.08) {
    alerts.push({
      id: "high-failed-payment-rate",
      title: "High failed payment rate",
      message:
        "More than 8% of checkout starts are failing payment. This is worth checking before making ad decisions.",
      tone: "warning",
    });
  }

  if (input.refundRate > 0.05) {
    alerts.push({
      id: "high-refund-rate",
      title: "High refund rate",
      message:
        "Refunds are above the 5% watch line. Review purchase expectations, onboarding, and support reasons.",
      tone: "warning",
    });
  }

  if (input.hasCreativeWinner) {
    alerts.push({
      id: "creative-winner",
      title: "Good creative winner detected",
      message:
        "At least one creative is producing strong purchase volume with healthy ROAS. Build controlled variations before changing the core angle.",
      tone: "positive",
    });
  }

  return alerts;
}

export function calculateBusinessMetrics(
  inputs: BusinessMetricInputs,
): BusinessMetrics {
  const productPrice = inputs.productPrice ?? 67;
  const refundAmount = inputs.refunds * productPrice;
  const netRevenue = inputs.grossRevenue - refundAmount;

  return {
    ...inputs,
    productPrice,
    refundAmount,
    netRevenue,
    estimatedProfit: netRevenue - inputs.adSpend,
    cpa: calculateCpa(inputs.adSpend, inputs.purchases),
    roas: calculateRoas(inputs.grossRevenue, inputs.adSpend),
    leadToPurchaseRate: calculateLeadToPurchaseRate(
      inputs.purchases,
      inputs.leads,
    ),
    refundRate: calculateRefundRate(inputs.refunds, inputs.purchases),
    failedPaymentRate: calculateFailedPaymentRate(
      inputs.failedPayments,
      inputs.checkoutStarts,
    ),
  };
}
