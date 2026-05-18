import { describe, expect, it } from "vitest";
import {
  getGhlConfig,
  mapGhlContact,
  mapGhlOpportunity,
  syncGoHighLevel,
} from "./sync";

function makeDb() {
  const writes: { table: string; payload: unknown }[] = [];

  return {
    writes,
    db: {
      from(table: string) {
        return {
          upsert(payload: unknown) {
            writes.push({ table, payload });
            return Promise.resolve({ error: null });
          },
          select() {
            return {
              in() {
                return Promise.resolve({
                  data: [{ id: "contact_uuid_1", external_id: "contact_1" }],
                  error: null,
                });
              },
            };
          },
        };
      },
    },
  };
}

describe("GoHighLevel sync helpers", () => {
  it("requires GHL env vars", async () => {
    expect(getGhlConfig({ GHL_API_KEY: "", GHL_LOCATION_ID: "" })).toBeNull();

    const result = await syncGoHighLevel({
      env: {},
      supabase: makeDb().db,
      fetcher: (() => Promise.resolve(new Response("{}"))) as typeof fetch,
    });

    expect(result).toEqual({
      ok: false,
      contactsSynced: 0,
      opportunitiesSynced: 0,
      eventsSynced: 0,
      errors: ["Set GHL_API_KEY and GHL_LOCATION_ID."],
    });
  });

  it("normalizes contacts with UTM fields, tags, custom fields, and raw JSON", () => {
    expect(
      mapGhlContact({
        id: "contact_1",
        firstName: "Mara",
        lastName: "Producer",
        contactName: "Mara Producer",
        email: "mara@example.com",
        phone: "+15555550123",
        source: "Meta Ads",
        tags: ["buyer", "lead"],
        customFields: [{ id: "genre", value: "hip hop" }],
        attributionSource: {
          utmSource: "meta",
          utmMedium: "paid_social",
          utmCampaign: "cold_producers",
          utmContent: "hook_a",
          utmTerm: "drums",
        },
        dateAdded: "2026-05-18T12:00:00.000Z",
      }),
    ).toMatchObject({
      external_id: "contact_1",
      first_name: "Mara",
      last_name: "Producer",
      name: "Mara Producer",
      email: "mara@example.com",
      phone: "+15555550123",
      lead_source: "Meta Ads",
      tags: ["buyer", "lead"],
      custom_fields: [{ id: "genre", value: "hip hop" }],
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "cold_producers",
      utm_content: "hook_a",
      utm_term: "drums",
      first_seen_at: "2026-05-18T12:00:00.000Z",
    });
  });

  it("normalizes opportunities with pipeline fields and value cents", () => {
    expect(
      mapGhlOpportunity(
        {
          id: "opp_1",
          contactId: "contact_1",
          pipelineId: "pipe_1",
          pipelineStageId: "stage_1",
          pipelineStageName: "Checkout Started",
          pipelineName: "Drum Mastery Suite",
          status: "open",
          monetaryValue: 67,
          source: "Meta Ads",
          createdAt: "2026-05-18T11:00:00.000Z",
          updatedAt: "2026-05-18T12:00:00.000Z",
          lastActivityAt: "2026-05-18T12:30:00.000Z",
        },
        new Map([["contact_1", "contact_uuid_1"]]),
      ),
    ).toMatchObject({
      external_id: "opp_1",
      contact_id: "contact_uuid_1",
      pipeline_id: "pipe_1",
      pipeline_stage_id: "stage_1",
      pipeline_stage_name: "Checkout Started",
      pipeline_name: "Drum Mastery Suite",
      stage_name: "Checkout Started",
      status: "open",
      value_cents: 6700,
      lead_source: "Meta Ads",
      opened_at: "2026-05-18T11:00:00.000Z",
      last_activity_at: "2026-05-18T12:30:00.000Z",
    });
  });

  it("syncs contacts and opportunities, and records zero events when activities are unsupported", async () => {
    const { db, writes } = makeDb();
    const fetcher = (async (url: URL | RequestInfo) => {
      const href = String(url);

      if (href.includes("/contacts/search")) {
        return Response.json({
          contacts: [{ id: "contact_1", email: "lead@example.com" }],
        });
      }

      if (href.includes("/opportunities/search")) {
        return Response.json({
          opportunities: [{ id: "opp_1", contactId: "contact_1", monetaryValue: 67 }],
        });
      }

      return Response.json({});
    }) as typeof fetch;

    const result = await syncGoHighLevel({
      env: { GHL_API_KEY: "key", GHL_LOCATION_ID: "loc_1" },
      supabase: db,
      fetcher,
      now: new Date("2026-05-18T12:00:00.000Z"),
    });

    expect(result).toMatchObject({
      ok: true,
      contactsSynced: 1,
      opportunitiesSynced: 1,
      eventsSynced: 0,
      errors: [],
    });
    expect(writes.map((write) => write.table)).toEqual([
      "ghl_contacts",
      "ghl_opportunities",
      "sync_runs",
    ]);
  });
});
