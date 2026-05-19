import { describe, expect, it } from "vitest";
import {
  buildGa4RowsFromReport,
  syncGa4Analytics,
  type Ga4RunReportClient,
} from "./reports";

function ga4Client(rows: unknown[]): Ga4RunReportClient {
  return {
    async runReport() {
      return [{ rows }];
    },
  };
}

function supabaseRecorder() {
  const calls: { table: string; payload: unknown; options?: unknown }[] = [];

  return {
    calls,
    client: {
      from(table: string) {
        return {
          upsert(payload: unknown, options?: unknown) {
            calls.push({ table, payload, options });
            return Promise.resolve({ error: null });
          },
        };
      },
    },
  };
}

describe("GA4 reports and sync", () => {
  it("builds GA4 aggregate rows from Data API report rows", () => {
    const rows = buildGa4RowsFromReport([
      {
        dimensionValues: [
          { value: "20260518" },
          { value: "page_view" },
          { value: "/drum-mastery" },
          { value: "https://drums.soundev.shop/" },
          { value: "facebook" },
          { value: "paid_social" },
          { value: "prospecting" },
        ],
        metricValues: [{ value: "11" }, { value: "8" }, { value: "5" }],
      },
    ]);

    expect(rows).toMatchObject([
      {
        external_id:
          "ga4:2026-05-18:page_view:/drum-mastery:https://drums.soundev.shop/:facebook:paid_social:prospecting",
        source: "ga4",
        metric_date: "2026-05-18",
        event_name: "page_view",
        page_path: "/drum-mastery",
        page_location: "https://drums.soundev.shop/",
        event_count: 11,
        active_users: 8,
        sessions: 5,
      },
    ]);
  });

  it("syncs GA4 rows and records a sync run", async () => {
    const db = supabaseRecorder();
    const result = await syncGa4Analytics({
      env: {
        GA4_PROPERTY_ID: "123456",
        GOOGLE_APPLICATION_CREDENTIALS_JSON: JSON.stringify({
          client_email: "ga4@example.com",
          private_key: "key",
        }),
      },
      client: ga4Client([
        {
          dimensionValues: [
            { value: "20260518" },
            { value: "page_view" },
            { value: "/" },
            { value: "https://drums.soundev.shop/" },
            { value: "facebook" },
            { value: "paid_social" },
            { value: "prospecting" },
          ],
          metricValues: [{ value: "10" }, { value: "7" }, { value: "4" }],
        },
      ]),
      supabase: db.client,
      now: new Date("2026-05-19T12:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    expect(result.rowsSynced).toBe(1);
    expect(result.eventsFound).toContain("page_view");
    expect(db.calls.map((call) => call.table)).toEqual([
      "ga4_event_metrics",
      "sync_runs",
    ]);
  });

  it("returns safe missing env errors without writing", async () => {
    const db = supabaseRecorder();
    const result = await syncGa4Analytics({
      env: {},
      client: ga4Client([]),
      supabase: db.client,
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Add the numeric GA4 property ID.");
    expect(db.calls).toEqual([]);
  });
});
