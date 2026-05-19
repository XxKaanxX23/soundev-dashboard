import { describe, expect, it } from "vitest";
import {
  DASHBOARD_DATA_RULES,
  getMetricSourceRule,
  SOURCE_OF_TRUTH_BY_SOURCE,
} from "./source-of-truth";

describe("source-of-truth rules", () => {
  it("locks Stripe as the source of truth for payment records", () => {
    expect(SOURCE_OF_TRUTH_BY_SOURCE.stripe.owns).toEqual(
      expect.arrayContaining([
        "purchases",
        "gross_revenue",
        "refunds",
        "failed_payments",
        "net_revenue",
      ]),
    );
  });

  it("locks Meta as ad delivery truth, not money truth", () => {
    expect(SOURCE_OF_TRUTH_BY_SOURCE.meta_ads.owns).toEqual(
      expect.arrayContaining(["ad_spend", "clicks", "ctr", "cpc", "cpm"]),
    );
    expect(getMetricSourceRule("meta_purchase_value")?.classification).toBe(
      "directional",
    );
  });

  it("keeps GA4 as a future behavior source", () => {
    expect(SOURCE_OF_TRUTH_BY_SOURCE.ga4.status).toBe("future");
    expect(getMetricSourceRule("landing_page_views")?.primarySource).toBe("ga4");
  });

  it("locks the no-mock-data and no-silent-assumptions rules", () => {
    expect(DASHBOARD_DATA_RULES.neverMixMockRowsWithLiveData).toBe(true);
    expect(DASHBOARD_DATA_RULES.noFakeBusinessDataInLiveUi).toBe(true);
    expect(DASHBOARD_DATA_RULES.noSilentAssumptions).toBe(true);
  });
});
