export type RecommendationTone = "positive" | "warning" | "danger";

export type IntelligenceWarning = {
  id: string;
  title: string;
  message: string;
  tone: RecommendationTone;
};

export type NextRecommendation = {
  id: string;
  title: string;
  body: string;
};

export type MetaAdSignal =
  | "Winner"
  | "Promising"
  | "Watch"
  | "Needs More Spend"
  | "Losing"
  | "No Signal Yet";

export function calculateStripeFees({
  grossRevenue,
  purchases,
  percentage = 0.029,
  fixedFee = 0.3,
}: {
  grossRevenue: number;
  purchases: number;
  percentage?: number;
  fixedFee?: number;
}) {
  return grossRevenue * percentage + purchases * fixedFee;
}

export function calculateBreakEvenCpa({
  productPrice = 67,
  stripeFeePerPurchase,
}: {
  productPrice?: number;
  stripeFeePerPurchase: number;
}) {
  return Math.max(productPrice - stripeFeePerPurchase, 0);
}

export function detectDataMismatches({
  metaPurchases,
  stripePurchases,
  metaRevenue,
  stripeRevenue,
  utmCoverageRate,
}: {
  metaPurchases: number;
  stripePurchases: number;
  metaRevenue: number;
  stripeRevenue: number;
  utmCoverageRate: number;
}): IntelligenceWarning[] {
  const warnings: IntelligenceWarning[] = [];
  const purchaseDelta = Math.abs(metaPurchases - stripePurchases);
  const baselinePurchases = Math.max(stripePurchases, 1);

  if (purchaseDelta >= 3 || purchaseDelta / baselinePurchases >= 0.25) {
    warnings.push({
      id: "purchase-mismatch",
      title: "Meta and Stripe purchases disagree",
      message:
        "Meta-reported purchases differ materially from Stripe purchases. Treat Meta as directional until attribution and event matching are reviewed.",
      tone: "warning",
    });
  }

  if (metaRevenue === 0 && stripeRevenue > 0) {
    warnings.push({
      id: "missing-meta-revenue",
      title: "Meta revenue is missing",
      message:
        "Stripe has revenue, but Meta action values are zero. ROAS inside Meta may be underreported or unavailable.",
      tone: "warning",
    });
  }

  if (utmCoverageRate < 0.8) {
    warnings.push({
      id: "low-utm-coverage",
      title: "Low UTM coverage",
      message:
        "Too many purchases are missing source, campaign, or content tags. Tighten checkout metadata before making budget calls from attribution.",
      tone: "danger",
    });
  }

  return warnings;
}

export function classifyMetaAd({
  spend,
  purchases,
  cpa,
  roas,
  productPrice = 67,
  targetCpa,
}: {
  spend: number;
  purchases: number;
  cpa: number;
  roas: number;
  productPrice?: number;
  targetCpa: number;
}): MetaAdSignal {
  if (roas >= 2 && purchases >= 3) {
    return "Winner";
  }

  if (spend >= productPrice && purchases === 0) {
    return "Losing";
  }

  if (cpa > 0 && cpa <= targetCpa && purchases >= 2) {
    return "Promising";
  }

  if (spend < productPrice * 0.5) {
    return "No Signal Yet";
  }

  if (spend < productPrice) {
    return "Needs More Spend";
  }

  return "Watch";
}

export function generateRecommendations({
  cpa,
  targetCpa,
  roas,
  refundRate,
  failedPaymentRate,
  mismatchWarnings,
  promisingAds,
  losingAds,
  missingMetaRevenue,
  lowUtmCoverage,
}: {
  cpa: number;
  targetCpa: number;
  roas: number;
  refundRate: number;
  failedPaymentRate: number;
  mismatchWarnings: IntelligenceWarning[];
  promisingAds: number;
  losingAds: number;
  missingMetaRevenue: boolean;
  lowUtmCoverage: boolean;
}): NextRecommendation[] {
  const recommendations: NextRecommendation[] = [];

  if (cpa > targetCpa) {
    recommendations.push({
      id: "reduce-cpa",
      title: "Protect margin before scaling",
      body: `CPA is above the break-even target. Hold budget increases until the best ads are closer to the target CPA.`,
    });
  }

  if (roas > 0 && roas < 2) {
    recommendations.push({
      id: "repair-roas",
      title: "Review ads below 2x ROAS",
      body: "ROAS is below the operating target. Check whether the issue is creative, tracking, or purchase conversion before adding spend.",
    });
  }

  if (refundRate > 0.05) {
    recommendations.push({
      id: "audit-refunds",
      title: "Audit refund reasons",
      body: "Refund rate is above the watch line. Review customer expectations, onboarding, and product clarity.",
    });
  }

  if (failedPaymentRate > 0.08) {
    recommendations.push({
      id: "fix-failed-payments",
      title: "Recover failed payment demand",
      body: "Failed payments are high enough to affect revenue. Review decline reasons and make sure retry paths are clear.",
    });
  }

  if (mismatchWarnings.length > 0 || missingMetaRevenue || lowUtmCoverage) {
    recommendations.push({
      id: "fix-attribution",
      title: "Fix attribution before fine budget decisions",
      body: "Stripe and Meta are not fully aligned. Use Stripe for money decisions and clean up UTMs and Meta value tracking.",
    });
  }

  if (promisingAds > 0) {
    recommendations.push({
      id: "scale-promising-ads",
      title: "Build variations from promising ads",
      body: `${promisingAds} ad${promisingAds === 1 ? "" : "s"} show useful signal. Create controlled variations before changing the core angle.`,
    });
  }

  if (losingAds > 0) {
    recommendations.push({
      id: "cut-losing-ads",
      title: "Pause clear losers",
      body: `${losingAds} ad${losingAds === 1 ? "" : "s"} spent at least the product price without a purchase. Move that spend toward better signals.`,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "hold-and-watch",
      title: "Hold the current setup and watch signal quality",
      body: "No urgent issues are crossing thresholds. Keep collecting data and watch the next batch of purchases.",
    });
  }

  return recommendations;
}
