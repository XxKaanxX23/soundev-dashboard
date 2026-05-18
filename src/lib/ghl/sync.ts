import type { GhlConfig, GhlEnv } from "./client";
import { createGhlClient, getGhlConfig } from "./client";
import type { GhlContact, GhlOpportunity, Json, SyncRun } from "@/lib/types";

type GhlRecord = Record<string, unknown>;
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
    };
  };
} | null;

type GhlContactInsert = Partial<Omit<GhlContact, "id" | "created_at" | "updated_at">> &
  Pick<GhlContact, "source" | "email" | "first_seen_at">;
type GhlOpportunityInsert = Partial<
  Omit<GhlOpportunity, "id" | "created_at" | "updated_at">
> &
  Pick<GhlOpportunity, "source" | "pipeline_name" | "stage_name" | "status" | "opened_at">;
type SyncRunInsert = Partial<Omit<SyncRun, "id" | "created_at" | "updated_at">> &
  Pick<SyncRun, "source">;

export type GhlSyncSummary = {
  ok: boolean;
  contactsSynced: number;
  opportunitiesSynced: number;
  eventsSynced: number;
  errors: string[];
};

type GhlCollection<T> = {
  contacts?: T[];
  opportunities?: T[];
  data?: T[];
};

type SyncOptions = {
  env?: GhlEnv;
  fetcher?: typeof fetch;
  supabase: unknown;
  now?: Date;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as GhlRecord)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asJson(value: unknown): Json {
  return (value ?? null) as Json;
}

function dateString(value: unknown) {
  const raw = asString(value);

  if (!raw) {
    return new Date().toISOString();
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function moneyCents(value: unknown) {
  return Math.round(asNumber(value) * 100);
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const string = asString(value);

    if (string) {
      return string;
    }
  }

  return null;
}

function attributionFrom(row: GhlRecord) {
  return (
    asRecord(row.attributionSource) ??
    asRecord(row.attribution) ??
    asRecord(row.sourceAttribution) ??
    row
  );
}

function customFieldsFrom(row: GhlRecord) {
  return row.customFields ?? row.customField ?? row.custom_fields ?? {};
}

function utmFrom(row: GhlRecord) {
  const attribution = attributionFrom(row);
  const customFields = asRecord(customFieldsFrom(row));

  return {
    utm_source: firstString(
      row.utm_source,
      row.utmSource,
      attribution.utm_source,
      attribution.utmSource,
      customFields?.utm_source,
      customFields?.utmSource,
    ),
    utm_medium: firstString(
      row.utm_medium,
      row.utmMedium,
      attribution.utm_medium,
      attribution.utmMedium,
      customFields?.utm_medium,
      customFields?.utmMedium,
    ),
    utm_campaign: firstString(
      row.utm_campaign,
      row.utmCampaign,
      attribution.utm_campaign,
      attribution.utmCampaign,
      customFields?.utm_campaign,
      customFields?.utmCampaign,
    ),
    utm_content: firstString(
      row.utm_content,
      row.utmContent,
      attribution.utm_content,
      attribution.utmContent,
      customFields?.utm_content,
      customFields?.utmContent,
    ),
    utm_term: firstString(
      row.utm_term,
      row.utmTerm,
      attribution.utm_term,
      attribution.utmTerm,
      customFields?.utm_term,
      customFields?.utmTerm,
    ),
  };
}

function collectionRows<T>(body: GhlCollection<T>, key: "contacts" | "opportunities") {
  const rows = body[key] ?? body.data ?? [];
  return Array.isArray(rows) ? rows : [];
}

export { getGhlConfig };

export function mapGhlContact(contact: GhlRecord): GhlContactInsert {
  const externalId = firstString(contact.id, contact.contactId) ?? "unknown_contact";
  const firstName = firstString(contact.firstName, contact.first_name);
  const lastName = firstString(contact.lastName, contact.last_name);
  const name =
    firstString(contact.contactName, contact.name) ??
    ([firstName, lastName].filter(Boolean).join(" ") || null);
  const email = firstString(contact.email, contact.emailAddress) ?? "";
  const now = new Date().toISOString();

  return {
    external_id: externalId,
    source: "gohighlevel",
    email,
    first_name: firstName,
    last_name: lastName,
    name,
    phone: firstString(contact.phone, contact.phoneNumber),
    lead_source: firstString(contact.source, contact.leadSource),
    first_seen_at: dateString(
      contact.dateAdded ?? contact.createdAt ?? contact.date_created ?? contact.created_at,
    ),
    tags: asJson(Array.isArray(contact.tags) ? contact.tags : []),
    custom_fields: asJson(customFieldsFrom(contact)),
    raw_event: asJson(contact),
    synced_at: now,
    ...utmFrom(contact),
  };
}

export function mapGhlOpportunity(
  opportunity: GhlRecord,
  contactIdMap = new Map<string, string>(),
): GhlOpportunityInsert {
  const externalId = firstString(opportunity.id, opportunity.opportunityId) ?? "unknown_opportunity";
  const contactExternalId = firstString(opportunity.contactId, opportunity.contact_id);
  const pipelineStageName = firstString(
    opportunity.pipelineStageName,
    opportunity.stageName,
    opportunity.stage_name,
  );
  const now = new Date().toISOString();

  return {
    external_id: externalId,
    source: "gohighlevel",
    contact_id: contactExternalId ? contactIdMap.get(contactExternalId) ?? null : null,
    pipeline_id: firstString(opportunity.pipelineId, opportunity.pipeline_id),
    pipeline_stage_id: firstString(
      opportunity.pipelineStageId,
      opportunity.pipeline_stage_id,
    ),
    pipeline_stage_name: pipelineStageName,
    pipeline_name:
      firstString(opportunity.pipelineName, opportunity.pipeline_name) ??
      "GoHighLevel Pipeline",
    stage_name: pipelineStageName ?? "Unknown stage",
    status: firstString(opportunity.status) ?? "open",
    value_cents: moneyCents(
      opportunity.monetaryValue ?? opportunity.monetary_value ?? opportunity.value,
    ),
    lead_source: firstString(opportunity.source, opportunity.leadSource),
    opened_at: dateString(
      opportunity.createdAt ?? opportunity.dateAdded ?? opportunity.created_at,
    ),
    closed_at: firstString(opportunity.closedAt, opportunity.closed_at),
    last_activity_at: firstString(
      opportunity.lastActivityAt,
      opportunity.last_activity_at,
      opportunity.updatedAt,
    ),
    raw_event: asJson(opportunity),
    synced_at: now,
    ...utmFrom(opportunity),
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

async function fetchContacts(config: GhlConfig, fetcher: typeof fetch) {
  const client = createGhlClient(config, fetcher);
  const body = await client.post<GhlCollection<GhlRecord>>("/contacts/search", {
    locationId: config.locationId,
    page: 1,
    pageLimit: 100,
  });

  return collectionRows(body, "contacts");
}

async function fetchOpportunities(config: GhlConfig, fetcher: typeof fetch) {
  const client = createGhlClient(config, fetcher);
  const body = await client.get<GhlCollection<GhlRecord>>("/opportunities/search", {
    location_id: config.locationId,
    limit: 100,
  });

  return collectionRows(body, "opportunities");
}

function syncRunPayload(summary: GhlSyncSummary, startedAt: string): SyncRunInsert {
  const finishedAt = new Date().toISOString();
  const recordsProcessed =
    summary.contactsSynced + summary.opportunitiesSynced + summary.eventsSynced;

  return {
    external_id: `ghl:${startedAt}`,
    source: "gohighlevel",
    connection_id: null,
    provider: "GoHighLevel",
    status: summary.ok ? "success" : "error",
    started_at: startedAt,
    finished_at: finishedAt,
    records_processed: recordsProcessed,
    error_message: summary.errors.join(" ") || null,
    synced_at: finishedAt,
  };
}

export async function syncGoHighLevel({
  env = process.env,
  fetcher = fetch,
  supabase,
  now = new Date(),
}: SyncOptions): Promise<GhlSyncSummary> {
  const startedAt = now.toISOString();
  const config = getGhlConfig(env);
  const summary: GhlSyncSummary = {
    ok: false,
    contactsSynced: 0,
    opportunitiesSynced: 0,
    eventsSynced: 0,
    errors: [],
  };

  if (!config) {
    summary.errors.push("Set GHL_API_KEY and GHL_LOCATION_ID.");
    return summary;
  }

  if (!supabase) {
    summary.errors.push("Supabase service role is not configured.");
    return summary;
  }

  const db = supabase as NonNullable<SupabaseLike>;

  try {
    const [contacts, opportunities] = await Promise.all([
      fetchContacts(config, fetcher),
      fetchOpportunities(config, fetcher),
    ]);
    const contactPayload = contacts.map(mapGhlContact);

    await upsertOrThrow(db, "ghl_contacts", contactPayload);
    summary.contactsSynced = contactPayload.length;

    const contactIds = await idMapFor(
      db,
      "ghl_contacts",
      contactPayload
        .map((contact) => contact.external_id)
        .filter((id): id is string => Boolean(id)),
    );
    const opportunityPayload = opportunities.map((opportunity) =>
      mapGhlOpportunity(opportunity, contactIds),
    );

    await upsertOrThrow(db, "ghl_opportunities", opportunityPayload);
    summary.opportunitiesSynced = opportunityPayload.length;
    summary.eventsSynced = 0;
    summary.ok = true;
  } catch (error) {
    summary.errors.push(
      error instanceof Error ? error.message : "GoHighLevel sync failed.",
    );
  }

  try {
    await upsertOrThrow(db, "sync_runs", syncRunPayload(summary, startedAt));
  } catch (error) {
    summary.ok = false;
    summary.errors.push(
      error instanceof Error
        ? `Could not store GoHighLevel sync run: ${error.message}`
        : "Could not store GoHighLevel sync run.",
    );
  }

  return summary;
}
