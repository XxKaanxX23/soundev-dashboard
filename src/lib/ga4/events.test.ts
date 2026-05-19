import { describe, expect, it } from "vitest";
import {
  buildGa4EventAuditResult,
  buildRequiredEventStatus,
  missingGa4Metric,
  normalizeGa4EventRows,
} from "./events";

describe("GA4 event helpers", () => {
  it("detects required events and marks purchase as comparison only", () => {
    const required = buildRequiredEventStatus([
      { eventName: "page_view", eventCount: 12 },
      { eventName: "primary_cta_click", eventCount: 3 },
      { eventName: "purchase", eventCount: 2 },
    ]);

    expect(required.page_view).toEqual({ found: true, count: 12 });
    expect(required.primary_cta_click).toEqual({ found: true, count: 3 });
    expect(required.checkout_start).toEqual({ found: false, count: 0 });
    expect(required.purchase.note).toBe(
      "comparison only; Stripe remains purchase truth",
    );
  });

  it("allows page_view filtered to the landing page as landing page view source", () => {
    const result = buildGa4EventAuditResult({
      propertyIdPresent: true,
      credentialsPresent: true,
      eventRows: [{ eventName: "page_view", eventCount: 20 }],
      landingPageViewCountFromPageView: 9,
      errors: {},
    });

    expect(result.requiredEvents.landing_page_view.found).toBe(false);
    expect(result.summary.canUseGa4ForLandingPageViews).toBe(true);
    expect(result.summary.canUseGa4ForCtaClicks).toBe(false);
    expect(result.summary.ga4InstrumentationNeeded).toBe(true);
  });

  it("requires instrumentation when CTA and checkout events are missing", () => {
    const result = buildGa4EventAuditResult({
      propertyIdPresent: true,
      credentialsPresent: true,
      eventRows: [{ eventName: "landing_page_view", eventCount: 40 }],
      landingPageViewCountFromPageView: 0,
      errors: {},
    });

    expect(result.summary.canUseGa4ForLandingPageViews).toBe(true);
    expect(result.summary.canUseGa4ForCtaClicks).toBe(false);
    expect(result.summary.canUseGa4ForCheckoutStarts).toBe(false);
    expect(result.summary.recommendedNextStep).toContain("primary_cta_click");
  });

  it("normalizes Data API event rows without private user data", () => {
    const rows = normalizeGa4EventRows([
      {
        dimensionValues: [{ value: "video_play" }],
        metricValues: [{ value: "7" }],
      },
    ]);

    expect(rows).toEqual([{ eventName: "video_play", eventCount: 7 }]);
  });

  it("returns tracking-not-configured state for missing GA4 metrics", () => {
    expect(missingGa4Metric("CTA clicks", "primary_cta_click")).toEqual({
      status: "tracking_not_configured",
      label: "Tracking not configured",
      detail:
        "CTA clicks is unavailable because GA4 event primary_cta_click is not configured or has no data.",
    });
  });
});
