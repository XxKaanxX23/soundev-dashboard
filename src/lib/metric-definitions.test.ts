import { describe, expect, it } from "vitest";
import {
  CORE_METRIC_IDS,
  getMetricDefinition,
  METRIC_DEFINITIONS,
} from "./metric-definitions";

describe("metric definitions", () => {
  it("defines every Phase 8 core metric", () => {
    expect(METRIC_DEFINITIONS.map((metric) => metric.id)).toEqual(
      expect.arrayContaining(CORE_METRIC_IDS),
    );
  });

  it("labels Stripe as the money source of truth", () => {
    expect(getMetricDefinition("gross_revenue")?.sourceOfTruth).toBe("stripe");
    expect(getMetricDefinition("net_revenue")?.sourceOfTruth).toBe("stripe");
    expect(getMetricDefinition("purchases")?.sourceOfTruth).toBe("stripe");
  });

  it("marks profit and fees as estimated", () => {
    expect(getMetricDefinition("estimated_stripe_fees")?.classification).toBe(
      "estimated",
    );
    expect(getMetricDefinition("estimated_profit")?.classification).toBe(
      "estimated",
    );
  });

  it("documents GA4-dependent missing-data behavior", () => {
    expect(getMetricDefinition("landing_page_views")?.missingDataBehavior).toContain(
      "GA4",
    );
    expect(getMetricDefinition("cta_clicks")?.missingDataBehavior).toContain(
      "GA4",
    );
    expect(getMetricDefinition("checkout_starts")?.knownCaveats).toContain("GA4");
  });
});
