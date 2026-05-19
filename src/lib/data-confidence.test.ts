import { describe, expect, it } from "vitest";
import {
  calculateDataConfidence,
  canUseMockBusinessData,
  getMissingDataDisplayState,
} from "./data-confidence";

describe("data confidence helpers", () => {
  it("returns explicit missing-data display states", () => {
    expect(
      getMissingDataDisplayState("tracking_not_configured", {
        metricName: "CTA clicks",
        source: "GA4",
      }),
    ).toEqual({
      status: "tracking_not_configured",
      label: "Tracking not configured",
      detail: "CTA clicks is unavailable until GA4 tracking is configured.",
    });
  });

  it("reports high confidence only when required sources are connected and fresh", () => {
    expect(
      calculateDataConfidence({
        requiredSources: ["stripe", "meta_ads"],
        connectedSources: ["stripe", "meta_ads"],
        staleSources: [],
        missingRequiredFields: [],
      }),
    ).toEqual({
      level: "high",
      reasons: ["All required sources are connected and fresh."],
    });
  });

  it("downgrades confidence for stale sources and missing fields", () => {
    expect(
      calculateDataConfidence({
        requiredSources: ["stripe", "meta_ads"],
        connectedSources: ["stripe", "meta_ads"],
        staleSources: ["meta_ads"],
        missingRequiredFields: ["utm_campaign"],
      }),
    ).toEqual({
      level: "medium",
      reasons: [
        "Meta Ads source is stale.",
        "Missing required field: utm_campaign.",
      ],
    });
  });

  it("allows mock business data only in demo mode with no live rows", () => {
    expect(canUseMockBusinessData({ hasLiveRows: true, isDemoMode: true })).toBe(
      false,
    );
    expect(canUseMockBusinessData({ hasLiveRows: false, isDemoMode: true })).toBe(
      true,
    );
    expect(canUseMockBusinessData({ hasLiveRows: false, isDemoMode: false })).toBe(
      false,
    );
  });
});
