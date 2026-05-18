import { describe, expect, it } from "vitest";
import { buildFunnelDataFromRows, normalizeGhlContacts } from "./funnel";
import type { GhlContact, GhlOpportunity } from "@/lib/types";

const baseContact: GhlContact = {
  id: "contact_uuid_1",
  external_id: "contact_1",
  source: "gohighlevel",
  created_at: "2026-05-18T00:00:00.000Z",
  updated_at: "2026-05-18T00:00:00.000Z",
  synced_at: "2026-05-18T00:00:00.000Z",
  email: "lead@example.com",
  first_name: "Lead",
  last_name: "One",
  name: "Lead One",
  phone: "+15555550123",
  lead_source: "Meta Ads",
  first_seen_at: "2026-05-18T01:00:00.000Z",
  tags: ["lead"],
  custom_fields: {},
  raw_event: {},
  utm_source: "meta",
  utm_medium: "paid_social",
  utm_campaign: "cold_producers",
  utm_content: "hook_a",
  utm_term: null,
};

const baseOpportunity: GhlOpportunity = {
  id: "opp_uuid_1",
  external_id: "opp_1",
  source: "gohighlevel",
  created_at: "2026-05-18T00:00:00.000Z",
  updated_at: "2026-05-18T00:00:00.000Z",
  synced_at: "2026-05-18T00:00:00.000Z",
  contact_id: "contact_uuid_1",
  pipeline_id: "pipe_1",
  pipeline_stage_id: "stage_1",
  pipeline_stage_name: "Checkout Started",
  pipeline_name: "Drum Mastery Suite",
  stage_name: "Checkout Started",
  status: "open",
  value_cents: 6700,
  lead_source: "Meta Ads",
  opened_at: "2026-05-18T02:00:00.000Z",
  closed_at: null,
  last_activity_at: "2026-05-18T03:00:00.000Z",
  raw_event: {},
  utm_source: "meta",
  utm_medium: "paid_social",
  utm_campaign: "cold_producers",
  utm_content: "hook_a",
  utm_term: null,
};

describe("funnel data", () => {
  it("normalizes GHL contacts for tables", () => {
    expect(normalizeGhlContacts([baseContact])).toEqual([
      expect.objectContaining({
        id: "contact_1",
        name: "Lead One",
        email: "lead@example.com",
        source: "Meta Ads",
        campaign: "cold_producers",
      }),
    ]);
  });

  it("uses live GHL rows instead of mock funnel rows", () => {
    const result = buildFunnelDataFromRows({
      contacts: [baseContact],
      opportunities: [baseOpportunity],
      purchases: 1,
      failedPayments: 0,
      refunds: 0,
    });

    expect(result.mode).toBe("live");
    expect(result.dashboardSnapshot.leads).toBe(1);
    expect(result.dashboardSnapshot.successfulPurchases).toBe(1);
    expect(result.overviewMetrics.leadToPurchaseRate).toBe(1);
    expect(result.funnelStages.map((stage) => stage.stage)).toEqual([
      "Leads",
      "Opportunities",
      "Checkout Started",
      "Purchases",
    ]);
    expect(result.topSources).toEqual([{ source: "Meta Ads", leads: 1 }]);
  });
});
