import { createMetaClient, getMetaConfig, type MetaClient, type MetaEnv } from "./client";

const purchaseActionTypes = new Set([
  "purchase",
  "omni_purchase",
  "offsite_conversion.fb_pixel_purchase",
]);

type MetaAction = {
  action_type?: string;
  value?: string | number;
};

type MetaCollection<T> = {
  data?: T[];
  paging?: {
    next?: string;
  };
};

type MetaCampaign = {
  id: string;
  name?: string;
  status?: string;
  objective?: string;
};

type MetaAdSet = {
  id: string;
  campaign_id?: string;
  name?: string;
  status?: string;
  targeting?: {
    age_min?: number;
    age_max?: number;
    geo_locations?: {
      countries?: string[];
    };
  };
};

type MetaAd = {
  id: string;
  campaign_id?: string;
  adset_id?: string;
  name?: string;
  status?: string;
  creative?: {
    name?: string;
  };
};

export type MetaInsight = {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
  purchase_roas?: MetaAction[];
  date_start?: string;
  date_stop?: string;
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
    select: (columns?: string) => {
      in: (column: string, values: string[]) => PromiseLike<SupabaseWriteResult>;
      eq?: (column: string, value: string) => {
        order: (
          column: string,
          options?: { ascending?: boolean },
        ) => {
          limit: (count: number) => {
            maybeSingle: () => Promise<SupabaseWriteResult>;
          };
        };
      };
      order?: (
        column: string,
        options?: { ascending?: boolean },
      ) => {
        limit: (count: number) => {
          maybeSingle: () => Promise<SupabaseWriteResult>;
        };
      };
    };
  };
} | null;

export type MetaSyncSummary = {
  ok: boolean;
  campaignsSynced: number;
  adSetsSynced: number;
  adsSynced: number;
  metricRowsSynced: number;
  errors: string[];
};

type SyncOptions = {
  env?: MetaEnv;
  fetcher?: typeof fetch;
  supabase: unknown;
  today?: Date;
};

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cents(value: unknown) {
  return Math.round(asNumber(value) * 100);
}

function normalizeStatus(value: unknown) {
  const status = typeof value === "string" ? value.toLowerCase() : "paused";

  if (status === "active" || status === "paused") {
    return status;
  }

  return "learning";
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultDateRange(today = new Date()) {
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - 6);

  return {
    since: dateOnly(since),
    until: dateOnly(today),
  };
}

function audienceFrom(adSet: MetaAdSet) {
  const countries = adSet.targeting?.geo_locations?.countries?.join(", ");
  const ages =
    adSet.targeting?.age_min || adSet.targeting?.age_max
      ? `${adSet.targeting.age_min ?? "?"}-${adSet.targeting.age_max ?? "?"}`
      : null;

  return [countries, ages].filter(Boolean).join(" | ") || null;
}

async function fetchAllMetaRows<T>(
  client: MetaClient,
  path: string,
  params: Record<string, string | number | boolean>,
  fetcher: typeof fetch,
): Promise<T[]> {
  const rows: T[] = [];
  let response = await client.get<MetaCollection<T>>(path, params);

  rows.push(...(response.data ?? []));

  while (response.paging?.next) {
    const nextResponse = await fetcher(response.paging.next);
    const body = (await nextResponse.json()) as MetaCollection<T> & {
      error?: { message?: string };
    };

    if (!nextResponse.ok) {
      throw new Error(body.error?.message ?? "Meta pagination request failed.");
    }

    response = body;
    rows.push(...(response.data ?? []));
  }

  return rows;
}

export function extractMetaPurchases(actions: MetaAction[] = []) {
  return actions.reduce((total, action) => {
    if (!action.action_type || !purchaseActionTypes.has(action.action_type)) {
      return total;
    }

    return total + asNumber(action.value);
  }, 0);
}

export function extractMetaRevenueCents(actionValues: MetaAction[] = []) {
  return actionValues.reduce((total, action) => {
    if (!action.action_type || !purchaseActionTypes.has(action.action_type)) {
      return total;
    }

    return total + cents(action.value);
  }, 0);
}

function extractMetaPurchaseRoas(purchaseRoas: MetaAction[] = []) {
  const purchaseRoasRow =
    purchaseRoas.find(
      (item) => item.action_type && purchaseActionTypes.has(item.action_type),
    ) ?? purchaseRoas[0];

  return asNumber(purchaseRoasRow?.value);
}

export function normalizeMetaInsight(insight: MetaInsight) {
  const metricDate = insight.date_start ?? insight.date_stop ?? dateOnly(new Date());
  const adId = insight.ad_id ?? "unknown_ad";
  const spendCents = cents(insight.spend);
  const actionValueRevenueCents = extractMetaRevenueCents(insight.action_values);
  const roasRevenueCents = Math.round(
    spendCents * extractMetaPurchaseRoas(insight.purchase_roas),
  );

  return {
    external_id: `${adId}:${metricDate}`,
    source: "meta_ads" as const,
    ad_external_id: adId,
    metric_date: metricDate,
    spend_cents: spendCents,
    impressions: Math.round(asNumber(insight.impressions)),
    clicks: Math.round(asNumber(insight.clicks)),
    purchases: Math.round(extractMetaPurchases(insight.actions)),
    revenue_cents: actionValueRevenueCents || roasRevenueCents,
    synced_at: new Date().toISOString(),
  };
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

async function idMapFor(
  supabase: NonNullable<SupabaseLike>,
  table: string,
  externalIds: string[],
) {
  if (externalIds.length === 0) {
    return new Map<string, string>();
  }

  const result = await supabase
    .from(table)
    .select("id,external_id")
    .in("external_id", externalIds);

  if (result?.error) {
    throw result.error;
  }

  const rows = (result?.data ?? []) as { id: string; external_id: string }[];
  return new Map(rows.map((row) => [row.external_id, row.id]));
}

function syncRunPayload(summary: MetaSyncSummary, startedAt: string) {
  const finishedAt = new Date().toISOString();
  const recordsProcessed =
    summary.campaignsSynced +
    summary.adSetsSynced +
    summary.adsSynced +
    summary.metricRowsSynced;

  return {
    external_id: `meta_ads:${startedAt}`,
    source: "meta_ads" as const,
    connection_id: null,
    provider: "Meta Ads" as const,
    status: summary.ok ? "success" : "error",
    started_at: startedAt,
    finished_at: finishedAt,
    records_processed: recordsProcessed,
    error_message: summary.errors.join(" ") || null,
    synced_at: finishedAt,
  };
}

export async function syncMetaAds({
  env = process.env,
  fetcher = fetch,
  supabase,
  today = new Date(),
}: SyncOptions): Promise<MetaSyncSummary> {
  const startedAt = new Date().toISOString();
  const config = getMetaConfig(env);
  const summary: MetaSyncSummary = {
    ok: false,
    campaignsSynced: 0,
    adSetsSynced: 0,
    adsSynced: 0,
    metricRowsSynced: 0,
    errors: [],
  };

  if (!config) {
    summary.errors.push("Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID.");
    return summary;
  }

  if (!supabase) {
    summary.errors.push("Supabase service role is not configured.");
    return summary;
  }

  try {
    const db = supabase as NonNullable<SupabaseLike>;
    const client = createMetaClient(config, fetcher);
    const range = defaultDateRange(today);
    const fields = {
      campaigns: "id,name,status,objective",
      adSets: "id,campaign_id,name,status,targeting",
      ads: "id,campaign_id,adset_id,name,status,creative{name}",
      insights:
        "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,ctr,cpc,cpm,actions,action_values,purchase_roas,date_start,date_stop",
    };

    const [campaigns, adSets, ads, insights] = await Promise.all([
      fetchAllMetaRows<MetaCampaign>(
        client,
        `/${config.adAccountId}/campaigns`,
        {
          fields: fields.campaigns,
          limit: 100,
        },
        fetcher,
      ),
      fetchAllMetaRows<MetaAdSet>(
        client,
        `/${config.adAccountId}/adsets`,
        {
          fields: fields.adSets,
          limit: 100,
        },
        fetcher,
      ),
      fetchAllMetaRows<MetaAd>(
        client,
        `/${config.adAccountId}/ads`,
        {
          fields: fields.ads,
          limit: 100,
        },
        fetcher,
      ),
      fetchAllMetaRows<MetaInsight>(
        client,
        `/${config.adAccountId}/insights`,
        {
          fields: fields.insights,
          level: "ad",
          time_increment: 1,
          time_range: JSON.stringify(range),
          limit: 100,
        },
        fetcher,
      ),
    ]);

    const campaignPayload = campaigns.map((campaign) => ({
      external_id: campaign.id,
      source: "meta_ads",
      name: campaign.name ?? "Untitled campaign",
      status: normalizeStatus(campaign.status),
      objective: campaign.objective ?? null,
      synced_at: new Date().toISOString(),
    }));

    await upsertOrThrow(db, "ad_campaigns", campaignPayload);
    summary.campaignsSynced = campaignPayload.length;

    const campaignIds = await idMapFor(
      db,
      "ad_campaigns",
      campaigns.map((campaign) => campaign.id),
    );

    const adSetPayload = adSets.flatMap((adSet) => {
      const campaignId =
        adSet.campaign_id && campaignIds.has(adSet.campaign_id)
          ? campaignIds.get(adSet.campaign_id)
          : null;

      if (!campaignId) {
        return [];
      }

      return [
        {
          external_id: adSet.id,
          source: "meta_ads",
          campaign_id: campaignId,
          name: adSet.name ?? "Untitled ad set",
          status: normalizeStatus(adSet.status),
          audience: audienceFrom(adSet),
          synced_at: new Date().toISOString(),
        },
      ];
    });

    await upsertOrThrow(db, "ad_sets", adSetPayload);
    summary.adSetsSynced = adSetPayload.length;

    const adSetIds = await idMapFor(
      db,
      "ad_sets",
      adSets.map((adSet) => adSet.id),
    );

    const adPayload = ads.flatMap((ad) => {
      const campaignId =
        ad.campaign_id && campaignIds.has(ad.campaign_id)
          ? campaignIds.get(ad.campaign_id)
          : null;
      const adSetId =
        ad.adset_id && adSetIds.has(ad.adset_id) ? adSetIds.get(ad.adset_id) : null;

      if (!campaignId || !adSetId) {
        return [];
      }

      return [
        {
          external_id: ad.id,
          source: "meta_ads",
          campaign_id: campaignId,
          ad_set_id: adSetId,
          name: ad.name ?? "Untitled ad",
          status: normalizeStatus(ad.status),
          creative_angle: ad.creative?.name ?? ad.name ?? "Unlabeled creative",
          utm_source: "meta",
          utm_medium: "paid_social",
          utm_campaign: ad.campaign_id ?? null,
          utm_content: ad.id,
          utm_term: null,
          synced_at: new Date().toISOString(),
        },
      ];
    });

    await upsertOrThrow(db, "ads", adPayload);
    summary.adsSynced = adPayload.length;

    const adIds = await idMapFor(
      db,
      "ads",
      ads.map((ad) => ad.id),
    );
    const metrics = insights
      .map(normalizeMetaInsight)
      .filter((metric) => adIds.has(metric.ad_external_id))
      .map(({ ad_external_id, ...metric }) => ({
        ...metric,
        ad_id: adIds.get(ad_external_id),
      }));

    await upsertOrThrow(db, "ad_daily_metrics", metrics, "ad_id,metric_date");
    summary.metricRowsSynced = metrics.length;
    summary.ok = true;
  } catch (error) {
    summary.errors.push(
      error instanceof Error ? error.message : "Meta sync failed unexpectedly.",
    );
  }

  try {
    const db = supabase as NonNullable<SupabaseLike>;
    await upsertOrThrow(db, "sync_runs", syncRunPayload(summary, startedAt));
  } catch (error) {
    summary.errors.push(
      error instanceof Error
        ? `Could not store Meta sync run: ${error.message}`
        : "Could not store Meta sync run.",
    );
    summary.ok = false;
  }

  return summary;
}
