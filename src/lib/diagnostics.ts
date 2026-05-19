import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type {
  AdDailyMetric,
  FailedPayment,
  Ga4EventMetric,
  GhlContact,
  GhlOpportunity,
  Refund,
  SyncRun,
  Transaction,
} from "@/lib/types";

type DiagnosticsEnv = Record<string, string | undefined>;

export type DiagnosticsEnvStatus = {
  supabaseEnvDetected: boolean;
  stripeSecretKeyDetected: boolean;
  stripeWebhookSecretDetected: boolean;
  supabaseServiceRoleDetected: boolean;
  metaAdsEnvDetected: boolean;
  ghlEnvDetected: boolean;
  ga4EnvDetected: boolean;
  ga4PropertyIdDetected: boolean;
  googleCredentialsDetected: boolean;
};

export type DiagnosticSummary = {
  label: string;
  value: string;
  detail?: string;
};

export type DiagnosticsData = {
  env: DiagnosticsEnvStatus;
  supabaseAdminClientAvailable: boolean;
  lastSyncRun: DiagnosticSummary | null;
  lastStripeTransaction: DiagnosticSummary | null;
  lastFailedPayment: DiagnosticSummary | null;
  lastRefund: DiagnosticSummary | null;
  lastStripeBackfillSync: DiagnosticSummary | null;
  lastMetaSyncRun: DiagnosticSummary | null;
  latestMetaMetricRow: DiagnosticSummary | null;
  metaErrorState: DiagnosticSummary | null;
  lastGhlSyncRun: DiagnosticSummary | null;
  latestGhlContact: DiagnosticSummary | null;
  latestGhlOpportunity: DiagnosticSummary | null;
  ghlErrorState: DiagnosticSummary | null;
  lastGa4SyncRun: DiagnosticSummary | null;
  latestGa4MetricRow: DiagnosticSummary | null;
  ga4ErrorState: DiagnosticSummary | null;
  ga4RequiredEvents: {
    measurementId: string;
    landingPageViewsAvailable: boolean;
    ctaClicksAvailable: boolean;
    checkoutStartsAvailable: boolean;
    requiredEventsStatus: Record<string, { found: boolean; count: number }>;
  };
  rowCounts: {
    transactions: number;
    failedPayments: number;
    refunds: number;
    adDailyMetrics: number;
    ads: number;
    adSets: number;
    adCampaigns: number;
    ghlContacts: number;
    ghlOpportunities: number;
    ga4EventMetrics: number;
  };
  fieldCoverage: {
    stripeUtmCoverage: number;
    metaPurchaseValueCoverage: number;
    ghlUtmCoverage: number;
    opportunityCount: number;
  };
};

type DiagnosticRows = {
  syncRun: SyncRun | null;
  transaction: Transaction | null;
  failedPayment: FailedPayment | null;
  refund: Refund | null;
  stripeBackfillSyncRun?: SyncRun | null;
  metaSyncRun?: SyncRun | null;
  metaMetric?: AdDailyMetric | null;
  ghlSyncRun?: SyncRun | null;
  ghlContact?: GhlContact | null;
  ghlOpportunity?: GhlOpportunity | null;
  ga4SyncRun?: SyncRun | null;
  ga4Metric?: Ga4EventMetric | null;
};

export function getDiagnosticsEnvStatus(
  env: DiagnosticsEnv = process.env,
): DiagnosticsEnvStatus {
  return {
    supabaseEnvDetected: Boolean(
      env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    stripeSecretKeyDetected: Boolean(env.STRIPE_SECRET_KEY),
    stripeWebhookSecretDetected: Boolean(env.STRIPE_WEBHOOK_SECRET),
    supabaseServiceRoleDetected: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    metaAdsEnvDetected: Boolean(env.META_ACCESS_TOKEN && env.META_AD_ACCOUNT_ID),
    ghlEnvDetected: Boolean(env.GHL_API_KEY && env.GHL_LOCATION_ID),
    ga4EnvDetected: Boolean(
      env.GA4_PROPERTY_ID && env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    ),
    ga4PropertyIdDetected: Boolean(env.GA4_PROPERTY_ID),
    googleCredentialsDetected: Boolean(env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
  };
}

function money(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function normalizeDiagnosticRows(rows: DiagnosticRows) {
  return {
    lastSyncRun: rows.syncRun
      ? {
          label: rows.syncRun.provider,
          value: rows.syncRun.status,
          detail: `${rows.syncRun.records_processed} records processed. Finished ${formatDate(rows.syncRun.finished_at)}.`,
          provider: rows.syncRun.provider,
          status: rows.syncRun.status,
          recordsProcessed: rows.syncRun.records_processed,
        }
      : null,
    lastStripeTransaction: rows.transaction
      ? {
          label: rows.transaction.customer_email,
          value: money(rows.transaction.amount_cents, rows.transaction.currency),
          detail: `${rows.transaction.product_name} paid ${formatDate(rows.transaction.purchased_at)}.`,
          customerEmail: rows.transaction.customer_email,
          amount: money(rows.transaction.amount_cents, rows.transaction.currency),
          externalId: rows.transaction.external_id,
        }
      : null,
    lastFailedPayment: rows.failedPayment
      ? {
          label: rows.failedPayment.customer_email,
          value: rows.failedPayment.failure_code,
          detail: `${money(rows.failedPayment.amount_cents, rows.failedPayment.currency)} failed ${formatDate(rows.failedPayment.failed_at)}. ${rows.failedPayment.failure_message}`,
          customerEmail: rows.failedPayment.customer_email,
          failureCode: rows.failedPayment.failure_code,
        }
      : null,
    lastRefund: rows.refund
      ? {
          label: rows.refund.customer_email,
          value: money(rows.refund.amount_cents, rows.refund.currency),
          detail: `${rows.refund.status} refund recorded ${formatDate(rows.refund.refunded_at)}.`,
          customerEmail: rows.refund.customer_email,
          reason: rows.refund.reason,
        }
      : null,
    lastStripeBackfillSync: rows.stripeBackfillSyncRun
      ? {
          label: rows.stripeBackfillSyncRun.provider,
          value: rows.stripeBackfillSyncRun.status,
          detail:
            rows.stripeBackfillSyncRun.error_message ??
            `${rows.stripeBackfillSyncRun.records_processed} records processed. Finished ${formatDate(rows.stripeBackfillSyncRun.finished_at)}.`,
        }
      : null,
    lastMetaSyncRun: rows.metaSyncRun
      ? {
          label: rows.metaSyncRun.provider,
          value: rows.metaSyncRun.status,
          detail: `${rows.metaSyncRun.records_processed} records processed. Finished ${formatDate(rows.metaSyncRun.finished_at)}.`,
        }
      : null,
    latestMetaMetricRow: rows.metaMetric
      ? {
          label: rows.metaMetric.metric_date,
          value: money(rows.metaMetric.spend_cents, "usd"),
          detail: `${rows.metaMetric.purchases} purchases and ${money(rows.metaMetric.revenue_cents, "usd")} revenue recorded.`,
        }
      : null,
    metaErrorState:
      rows.metaSyncRun?.status === "error"
        ? {
            label: "Meta Ads",
            value: "error",
            detail: rows.metaSyncRun.error_message ?? "Last Meta sync failed.",
          }
        : null,
    lastGhlSyncRun: rows.ghlSyncRun
      ? {
          label: rows.ghlSyncRun.provider,
          value: rows.ghlSyncRun.status,
          detail: `${rows.ghlSyncRun.records_processed} records processed. Finished ${formatDate(rows.ghlSyncRun.finished_at)}.`,
        }
      : null,
    latestGhlContact: rows.ghlContact
      ? {
          label: rows.ghlContact.email,
          value:
            rows.ghlContact.name ??
            [rows.ghlContact.first_name, rows.ghlContact.last_name]
              .filter(Boolean)
              .join(" ") ??
            "Contact",
          detail: `First seen ${formatDate(rows.ghlContact.first_seen_at)}. Source: ${rows.ghlContact.lead_source ?? rows.ghlContact.utm_source ?? "Untracked"}.`,
        }
      : null,
    latestGhlOpportunity: rows.ghlOpportunity
      ? {
          label:
            rows.ghlOpportunity.pipeline_stage_name ??
            rows.ghlOpportunity.stage_name,
          value: money(rows.ghlOpportunity.value_cents, "usd"),
          detail: `${rows.ghlOpportunity.status} opportunity opened ${formatDate(rows.ghlOpportunity.opened_at)}.`,
        }
      : null,
    ghlErrorState:
      rows.ghlSyncRun?.status === "error"
        ? {
            label: "GoHighLevel",
            value: "error",
            detail: rows.ghlSyncRun.error_message ?? "Last GoHighLevel sync failed.",
          }
        : null,
    lastGa4SyncRun: rows.ga4SyncRun
      ? {
          label: rows.ga4SyncRun.provider,
          value: rows.ga4SyncRun.status,
          detail: `${rows.ga4SyncRun.records_processed} records processed. Finished ${formatDate(rows.ga4SyncRun.finished_at)}.`,
        }
      : null,
    latestGa4MetricRow: rows.ga4Metric
      ? {
          label: rows.ga4Metric.event_name,
          value: rows.ga4Metric.event_count.toLocaleString(),
          detail: `${rows.ga4Metric.metric_date} · ${rows.ga4Metric.page_path ?? rows.ga4Metric.page_location ?? "No page"} · source ${rows.ga4Metric.source_name ?? "untracked"}.`,
        }
      : null,
    ga4ErrorState:
      rows.ga4SyncRun?.status === "error"
        ? {
            label: "GA4",
            value: "error",
            detail: rows.ga4SyncRun.error_message ?? "Last GA4 sync failed.",
          }
        : null,
  };
}

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>;

async function fetchRowCounts(supabase: SupabaseClient) {
  const countOf = async (table: string) => {
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    return count ?? 0;
  };

  const [
    transactions,
    failedPayments,
    refunds,
    adDailyMetrics,
    ads,
    adSets,
    adCampaigns,
    ghlContacts,
    ghlOpportunities,
    ga4EventMetrics,
  ] = await Promise.all([
    countOf("transactions"),
    countOf("failed_payments"),
    countOf("refunds"),
    countOf("ad_daily_metrics"),
    countOf("ads"),
    countOf("ad_sets"),
    countOf("ad_campaigns"),
    countOf("ghl_contacts"),
    countOf("ghl_opportunities"),
    countOf("ga4_event_metrics"),
  ]);

  return {
    transactions,
    failedPayments,
    refunds,
    adDailyMetrics,
    ads,
    adSets,
    adCampaigns,
    ghlContacts,
    ghlOpportunities,
    ga4EventMetrics,
  };
}

async function fetchFieldCoverage(supabase: SupabaseClient) {
  const [
    totalTransactions,
    utmTaggedTransactions,
    totalMetaMetrics,
    metaWithRevenue,
    totalGhlContacts,
    ghlWithUtm,
    ghlOpportunities,
  ] = await Promise.all([
    supabase.from("transactions").select("id", { count: "exact", head: true }),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .not("utm_source", "is", null),
    supabase.from("ad_daily_metrics").select("id", { count: "exact", head: true }),
    supabase
      .from("ad_daily_metrics")
      .select("id", { count: "exact", head: true })
      .gt("revenue_cents", 0),
    supabase.from("ghl_contacts").select("id", { count: "exact", head: true }),
    supabase
      .from("ghl_contacts")
      .select("id", { count: "exact", head: true })
      .not("utm_source", "is", null),
    supabase.from("ghl_opportunities").select("id", { count: "exact", head: true }),
  ]);

  const t = totalTransactions.count ?? 0;
  const u = utmTaggedTransactions.count ?? 0;
  const m = totalMetaMetrics.count ?? 0;
  const mv = metaWithRevenue.count ?? 0;
  const g = totalGhlContacts.count ?? 0;
  const gu = ghlWithUtm.count ?? 0;

  return {
    stripeUtmCoverage: t === 0 ? 0 : u / t,
    metaPurchaseValueCoverage: m === 0 ? 0 : mv / m,
    ghlUtmCoverage: g === 0 ? 0 : gu / g,
    opportunityCount: ghlOpportunities.count ?? 0,
  };
}

async function fetchGa4RequiredEvents(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("ga4_event_metrics")
    .select("event_name,event_count,page_location,page_path");
  const rows = (data ?? []) as Pick<
    Ga4EventMetric,
    "event_name" | "event_count" | "page_location" | "page_path"
  >[];
  const countFor = (eventName: string) =>
    rows
      .filter((row) => row.event_name === eventName)
      .reduce((sum, row) => sum + row.event_count, 0);
  const landingPageViewCount =
    countFor("landing_page_view") +
    rows
      .filter(
        (row) =>
          row.event_name === "page_view" &&
          (row.page_location?.includes("https://drums.soundev.shop/") ||
            row.page_path === "/"),
      )
      .reduce((sum, row) => sum + row.event_count, 0);
  const eventNames = [
    "landing_page_view",
    "page_view",
    "primary_cta_click",
    "video_play",
    "video_25_percent",
    "video_50_percent",
    "video_75_percent",
    "video_complete",
    "checkout_start",
    "purchase",
  ];
  const requiredEventsStatus = Object.fromEntries(
    eventNames.map((eventName) => {
      const count = countFor(eventName);
      return [eventName, { found: count > 0, count }];
    }),
  );

  return {
    measurementId: "G-0D4LN9DL38",
    landingPageViewsAvailable: landingPageViewCount > 0,
    ctaClicksAvailable: countFor("primary_cta_click") > 0,
    checkoutStartsAvailable: countFor("checkout_start") > 0,
    requiredEventsStatus,
  };
}

export async function getDiagnosticsData(): Promise<DiagnosticsData> {

  const env = getDiagnosticsEnvStatus();
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    const emptyRowCounts = {
      transactions: 0,
      failedPayments: 0,
      refunds: 0,
      adDailyMetrics: 0,
      ads: 0,
      adSets: 0,
      adCampaigns: 0,
      ghlContacts: 0,
      ghlOpportunities: 0,
      ga4EventMetrics: 0,
    };
    const emptyFieldCoverage = {
      stripeUtmCoverage: 0,
      metaPurchaseValueCoverage: 0,
      ghlUtmCoverage: 0,
      opportunityCount: 0,
    };
    return {
      env,
      supabaseAdminClientAvailable: false,
      ...normalizeDiagnosticRows({
        syncRun: null,
        transaction: null,
        failedPayment: null,
        refund: null,
        stripeBackfillSyncRun: null,
        metaSyncRun: null,
        metaMetric: null,
        ghlSyncRun: null,
        ghlContact: null,
        ghlOpportunity: null,
        ga4SyncRun: null,
        ga4Metric: null,
      }),
      ga4RequiredEvents: {
        measurementId: "G-0D4LN9DL38",
        landingPageViewsAvailable: false,
        ctaClicksAvailable: false,
        checkoutStartsAvailable: false,
        requiredEventsStatus: {},
      },
      rowCounts: emptyRowCounts,
      fieldCoverage: emptyFieldCoverage,
    };
  }

  try {
    const [
      syncRun,
      transaction,
      failedPayment,
      refund,
      stripeBackfillSyncRun,
      metaSyncRun,
      metaMetric,
      ghlSyncRun,
      ghlContact,
      ghlOpportunity,
      ga4SyncRun,
      ga4Metric,
    ] =
      await Promise.all([
      supabase
        .from("sync_runs")
        .select("*")
        .eq("provider", "Stripe")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select("*")
        .order("purchased_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("failed_payments")
        .select("*")
        .order("failed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("refunds")
        .select("*")
        .order("refunded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sync_runs")
        .select("*")
        .eq("provider", "Stripe")
        .like("external_id", "stripe_backfill:%")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sync_runs")
        .select("*")
        .eq("provider", "Meta Ads")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ad_daily_metrics")
        .select("*")
        .order("metric_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sync_runs")
        .select("*")
        .eq("provider", "GoHighLevel")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ghl_contacts")
        .select("*")
        .order("first_seen_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ghl_opportunities")
        .select("*")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sync_runs")
        .select("*")
        .eq("provider", "GA4")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ga4_event_metrics")
        .select("*")
        .order("metric_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      env,
      supabaseAdminClientAvailable: true,
      ...normalizeDiagnosticRows({
        syncRun: syncRun.error ? null : (syncRun.data as SyncRun | null),
        transaction: transaction.error
          ? null
          : (transaction.data as Transaction | null),
        failedPayment: failedPayment.error
          ? null
          : (failedPayment.data as FailedPayment | null),
        refund: refund.error ? null : (refund.data as Refund | null),
        stripeBackfillSyncRun: stripeBackfillSyncRun.error
          ? null
          : (stripeBackfillSyncRun.data as SyncRun | null),
        metaSyncRun: metaSyncRun.error ? null : (metaSyncRun.data as SyncRun | null),
        metaMetric: metaMetric.error
          ? null
          : (metaMetric.data as AdDailyMetric | null),
        ghlSyncRun: ghlSyncRun.error ? null : (ghlSyncRun.data as SyncRun | null),
        ghlContact: ghlContact.error ? null : (ghlContact.data as GhlContact | null),
        ghlOpportunity: ghlOpportunity.error
          ? null
          : (ghlOpportunity.data as GhlOpportunity | null),
        ga4SyncRun: ga4SyncRun.error ? null : (ga4SyncRun.data as SyncRun | null),
        ga4Metric: ga4Metric.error
          ? null
          : (ga4Metric.data as Ga4EventMetric | null),
      }),
      rowCounts: await fetchRowCounts(supabase),
      fieldCoverage: await fetchFieldCoverage(supabase),
      ga4RequiredEvents: await fetchGa4RequiredEvents(supabase),
    };
  } catch {
    const emptyRowCounts = {
      transactions: 0, failedPayments: 0, refunds: 0,
      adDailyMetrics: 0, ads: 0, adSets: 0, adCampaigns: 0,
      ghlContacts: 0, ghlOpportunities: 0, ga4EventMetrics: 0,
    };
    return {
      env,
      supabaseAdminClientAvailable: false,
      ...normalizeDiagnosticRows({
        syncRun: null, transaction: null, failedPayment: null, refund: null,
        stripeBackfillSyncRun: null, metaSyncRun: null, metaMetric: null,
        ghlSyncRun: null, ghlContact: null, ghlOpportunity: null,
        ga4SyncRun: null, ga4Metric: null,
      }),
      ga4RequiredEvents: {
        measurementId: "G-0D4LN9DL38",
        landingPageViewsAvailable: false,
        ctaClicksAvailable: false,
        checkoutStartsAvailable: false,
        requiredEventsStatus: {},
      },
      rowCounts: emptyRowCounts,
      fieldCoverage: { stripeUtmCoverage: 0, metaPurchaseValueCoverage: 0, ghlUtmCoverage: 0, opportunityCount: 0 },
    };
  }
}
