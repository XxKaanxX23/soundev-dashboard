import { BUSINESS_SETTINGS } from "@/lib/business-settings";
import { GA4_MEASUREMENT_ID, createGa4Client, getGa4Config, getGa4EnvStatus, type Ga4Env } from "./client";
import {
  buildGa4EventAuditResult,
  buildRequiredEventStatus,
  normalizeGa4EventRows,
  type Ga4EventAuditResult,
} from "./events";
import type { Json } from "@/lib/types";

type DataApiRow = {
  dimensionValues?: { value?: string | null }[];
  metricValues?: { value?: string | null }[];
};

export type Ga4RunReportClient = {
  runReport: (request: Record<string, unknown>) => Promise<[{ rows?: DataApiRow[] }]>;
};

type SupabaseWriteResult = {
  data?: unknown;
  error?: { message?: string } | Error | null;
};

type SupabaseLike = {
  from: (table: string) => {
    upsert: (
      payload: unknown,
      options?: { onConflict?: string },
    ) => PromiseLike<SupabaseWriteResult>;
  };
} | null;

export type Ga4MetricInsert = {
  external_id: string;
  source: "ga4";
  metric_date: string;
  event_name: string;
  page_path: string | null;
  page_location: string | null;
  source_name: string | null;
  medium: string | null;
  campaign: string | null;
  event_count: number;
  active_users: number;
  sessions: number;
  raw: Json;
  synced_at: string;
};

export type Ga4SyncSummary = {
  ok: boolean;
  rowsSynced: number;
  eventsFound: string[];
  requiredEventsStatus: ReturnType<typeof buildRequiredEventStatus>;
  errors: string[];
};

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateFromGa4(value: string) {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  return value || new Date().toISOString().slice(0, 10);
}

function cleanDimension(value: string | null | undefined) {
  if (!value || value === "(not set)" || value === "(none)") {
    return null;
  }

  return value;
}

export function buildGa4RowsFromReport(rows: DataApiRow[] = []): Ga4MetricInsert[] {
  const syncedAt = new Date().toISOString();

  return rows.map((row) => {
    const metricDate = dateFromGa4(row.dimensionValues?.[0]?.value ?? "");
    const eventName = row.dimensionValues?.[1]?.value ?? "(not set)";
    const pagePath = cleanDimension(row.dimensionValues?.[2]?.value);
    const pageLocation = cleanDimension(row.dimensionValues?.[3]?.value);
    const sourceName = cleanDimension(row.dimensionValues?.[4]?.value);
    const medium = cleanDimension(row.dimensionValues?.[5]?.value);
    const campaign = cleanDimension(row.dimensionValues?.[6]?.value);

    return {
      external_id: [
        "ga4",
        metricDate,
        eventName,
        pagePath ?? "",
        pageLocation ?? "",
        sourceName ?? "",
        medium ?? "",
        campaign ?? "",
      ].join(":"),
      source: "ga4",
      metric_date: metricDate,
      event_name: eventName,
      page_path: pagePath,
      page_location: pageLocation,
      source_name: sourceName,
      medium,
      campaign,
      event_count: Math.round(asNumber(row.metricValues?.[0]?.value)),
      active_users: Math.round(asNumber(row.metricValues?.[1]?.value)),
      sessions: Math.round(asNumber(row.metricValues?.[2]?.value)),
      raw: {
        dimensionValues: row.dimensionValues?.map((item) => item.value ?? null) ?? [],
        metricValues: row.metricValues?.map((item) => item.value ?? null) ?? [],
      },
      synced_at: syncedAt,
    };
  });
}

async function runReportRows(
  client: Ga4RunReportClient,
  propertyId: string,
  request: Record<string, unknown>,
) {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    ...request,
  });

  return response.rows ?? [];
}

function eventAuditRequest() {
  return {
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 50,
  };
}

function landingPageViewRequest() {
  return {
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    dimensions: [{ name: "eventName" }, { name: "pageLocation" }, { name: "pagePath" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "eventName",
              stringFilter: { matchType: "EXACT", value: "page_view" },
            },
          },
          {
            filter: {
              fieldName: "pageLocation",
              stringFilter: {
                matchType: "CONTAINS",
                value: BUSINESS_SETTINGS.landingPageUrl,
              },
            },
          },
        ],
      },
    },
  };
}

function syncRowsRequest() {
  return {
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    dimensions: [
      { name: "date" },
      { name: "eventName" },
      { name: "pagePath" },
      { name: "pageLocation" },
      { name: "sessionSource" },
      { name: "sessionMedium" },
      { name: "sessionCampaignName" },
    ],
    metrics: [{ name: "eventCount" }, { name: "activeUsers" }, { name: "sessions" }],
    limit: 10000,
  };
}

export async function auditGa4Events({
  env = process.env,
  client = createGa4Client(env) as Ga4RunReportClient | null,
}: {
  env?: Ga4Env;
  client?: Ga4RunReportClient | null;
} = {}): Promise<Ga4EventAuditResult> {
  const status = getGa4EnvStatus(env);
  const config = getGa4Config(env);

  if (!config.ok || !client) {
    return buildGa4EventAuditResult({
      propertyIdPresent: status.ga4PropertyIdDetected,
      credentialsPresent: status.googleCredentialsDetected,
      eventRows: [],
      landingPageViewCountFromPageView: 0,
      errors: Object.fromEntries(config.errors.map((error, index) => [`config_${index}`, error])),
    });
  }

  const errors: Record<string, string> = {};
  let eventRows: ReturnType<typeof normalizeGa4EventRows> = [];
  let landingPageViewCountFromPageView = 0;

  try {
    eventRows = normalizeGa4EventRows(
      await runReportRows(client, config.propertyId, eventAuditRequest()),
    );
  } catch (error) {
    errors.events =
      error instanceof Error ? error.message : "GA4 event audit report failed.";
  }

  try {
    const rows = await runReportRows(client, config.propertyId, landingPageViewRequest());
    landingPageViewCountFromPageView = rows.reduce(
      (sum, row) => sum + asNumber(row.metricValues?.[0]?.value),
      0,
    );
  } catch (error) {
    errors.landingPageViews =
      error instanceof Error
        ? error.message
        : "GA4 landing page page_view report failed.";
  }

  return buildGa4EventAuditResult({
    propertyIdPresent: true,
    credentialsPresent: true,
    eventRows,
    landingPageViewCountFromPageView,
    errors,
  });
}

async function upsertOrThrow(
  supabase: NonNullable<SupabaseLike>,
  table: string,
  payload: unknown,
  onConflict = "external_id",
) {
  if (Array.isArray(payload) && payload.length === 0) {
    return;
  }

  const { error } = await supabase.from(table).upsert(payload, { onConflict });

  if (error) {
    throw error;
  }
}

function syncRunPayload(summary: Ga4SyncSummary, startedAt: string) {
  const finishedAt = new Date().toISOString();

  return {
    external_id: `ga4:${startedAt}`,
    source: "ga4" as const,
    connection_id: null,
    provider: "GA4" as const,
    status: summary.ok ? "success" : "error",
    started_at: startedAt,
    finished_at: finishedAt,
    records_processed: summary.rowsSynced,
    error_message: summary.errors.join(" ") || null,
    synced_at: finishedAt,
  };
}

export async function syncGa4Analytics({
  env = process.env,
  client = createGa4Client(env) as Ga4RunReportClient | null,
  supabase,
  now = new Date(),
}: {
  env?: Ga4Env;
  client?: Ga4RunReportClient | null;
  supabase: unknown;
  now?: Date;
}): Promise<Ga4SyncSummary> {
  const startedAt = now.toISOString();
  const config = getGa4Config(env);
  const summary: Ga4SyncSummary = {
    ok: false,
    rowsSynced: 0,
    eventsFound: [],
    requiredEventsStatus: buildRequiredEventStatus([]),
    errors: [],
  };

  if (!config.ok) {
    summary.errors.push(...config.errors);
    return summary;
  }

  if (!client) {
    summary.errors.push("GA4 Data API client is not available.");
    return summary;
  }

  if (!supabase) {
    summary.errors.push("Supabase service role is not configured.");
    return summary;
  }

  try {
    const db = supabase as NonNullable<SupabaseLike>;
    const rows = buildGa4RowsFromReport(
      await runReportRows(client, config.propertyId, syncRowsRequest()),
    );
    const eventCounts = rows.reduce((map, row) => {
      map.set(row.event_name, (map.get(row.event_name) ?? 0) + row.event_count);
      return map;
    }, new Map<string, number>());

    await upsertOrThrow(db, "ga4_event_metrics", rows);
    summary.rowsSynced = rows.length;
    summary.eventsFound = [...eventCounts.keys()].sort();
    summary.requiredEventsStatus = buildRequiredEventStatus(
      [...eventCounts].map(([eventName, eventCount]) => ({ eventName, eventCount })),
    );
    summary.ok = true;
  } catch (error) {
    summary.errors.push(
      error instanceof Error ? error.message : "GA4 sync failed unexpectedly.",
    );
  }

  try {
    const db = supabase as NonNullable<SupabaseLike>;
    await upsertOrThrow(db, "sync_runs", syncRunPayload(summary, startedAt));
  } catch (error) {
    summary.errors.push(
      error instanceof Error
        ? `Could not store GA4 sync run: ${error.message}`
        : "Could not store GA4 sync run.",
    );
    summary.ok = false;
  }

  return summary;
}

export { GA4_MEASUREMENT_ID };
