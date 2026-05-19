import type { GhlClient, GhlEnv } from "./client";
import { createGhlClient, getGhlConfig } from "./client";

export type GhlAuditEndpointKey =
  | "contacts"
  | "opportunities"
  | "forms"
  | "formSubmissions"
  | "funnels"
  | "funnelPages"
  | "orders"
  | "transactions"
  | "customFields"
  | "location";

export type GhlEndpointAuditResult = {
  ok: boolean;
  count: number;
  fieldNames: string[];
  utmFieldsFound: string[];
  attributionFieldsFound: string[];
  notes: string[];
  error?: string;
  sample?: Record<string, unknown>[];
};

export type GhlCapabilitySummary = {
  canUseGhlForLeads: boolean;
  canUseGhlForForms: boolean;
  canUseGhlForOrders: boolean;
  canUseGhlForCheckoutStarts: boolean | "unknown";
  canUseGhlForLandingPageViews: boolean | "unknown";
  canUseGhlForUtmAttribution: boolean | "unknown";
  directGa4StillRecommended: boolean;
  recommendedNextStep: string;
};

export type GhlCapabilityAuditResult = {
  ok: boolean;
  locationIdPresent: boolean;
  tokenPresent: boolean;
  endpoints: Record<GhlAuditEndpointKey, GhlEndpointAuditResult>;
  summary: GhlCapabilitySummary;
  errors: Partial<Record<GhlAuditEndpointKey | "config", string>>;
};

type AuditOptions = {
  env?: GhlEnv;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

type Probe = {
  method: "GET" | "POST";
  path: string;
  params?: Record<string, string | number>;
  body?: Record<string, unknown>;
};

type GhlRecord = Record<string, unknown>;

const endpointKeys: GhlAuditEndpointKey[] = [
  "contacts",
  "opportunities",
  "forms",
  "formSubmissions",
  "funnels",
  "funnelPages",
  "orders",
  "transactions",
  "customFields",
  "location",
];

const collectionKeys: Record<GhlAuditEndpointKey, string[]> = {
  contacts: ["contacts", "data", "items", "results"],
  opportunities: ["opportunities", "data", "items", "results"],
  forms: ["forms", "data", "items", "results"],
  formSubmissions: ["submissions", "formSubmissions", "data", "items", "results"],
  funnels: ["funnels", "data", "items", "results"],
  funnelPages: ["pages", "funnelPages", "data", "items", "results"],
  orders: ["orders", "data", "items", "results"],
  transactions: ["transactions", "data", "items", "results"],
  customFields: ["customFields", "custom_fields", "fields", "data", "items", "results"],
  location: ["location", "data"],
};

const utmFieldOrder = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
] as const;

function emptyEndpoint(notes: string[] = []): GhlEndpointAuditResult {
  return {
    ok: false,
    count: 0,
    fieldNames: [],
    utmFieldsFound: [],
    attributionFieldsFound: [],
    notes,
  };
}

function emptyEndpoints() {
  return Object.fromEntries(
    endpointKeys.map((key) => [
      key,
      emptyEndpoint(["Audit did not run because GoHighLevel credentials are missing."]),
    ]),
  ) as Record<GhlAuditEndpointKey, GhlEndpointAuditResult>;
}

function asRecord(value: unknown): GhlRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as GhlRecord)
    : null;
}

function normalizeTerm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "GoHighLevel endpoint failed.";
}

function withTimeout(fetcher: typeof fetch, timeoutMs: number): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.race([
      fetcher(input, init),
      new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error("GoHighLevel request timed out.")), timeoutMs);
      }),
    ])) as typeof fetch;
}

function extractRows(body: unknown, endpoint: GhlAuditEndpointKey) {
  if (Array.isArray(body)) {
    return body.filter(asRecord) as GhlRecord[];
  }

  const record = asRecord(body);

  if (!record) {
    return [];
  }

  if (endpoint === "location") {
    const nested = asRecord(record.location) ?? asRecord(record.data);
    return [nested ?? record];
  }

  for (const key of collectionKeys[endpoint]) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value.filter(asRecord) as GhlRecord[];
    }

    const nested = asRecord(value);
    const nestedItems = nested?.items ?? nested?.data ?? nested?.results;

    if (Array.isArray(nestedItems)) {
      return nestedItems.filter(asRecord) as GhlRecord[];
    }
  }

  return [];
}

function collectFieldNames(value: unknown, prefix = "", depth = 0): string[] {
  if (depth > 3) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.slice(0, 5).flatMap((item) => collectFieldNames(item, prefix, depth));
  }

  const record = asRecord(value);

  if (!record) {
    return [];
  }

  const fields: string[] = [];

  for (const [key, nested] of Object.entries(record)) {
    const field = prefix ? `${prefix}.${key}` : key;
    fields.push(field);

    if (nested && typeof nested === "object") {
      fields.push(...collectFieldNames(nested, field, depth + 1));
    }
  }

  return fields;
}

function collectPrimitiveTerms(value: unknown, depth = 0): string[] {
  if (depth > 3) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).flatMap((item) => collectPrimitiveTerms(item, depth + 1));
  }

  const record = asRecord(value);

  if (!record) {
    return [];
  }

  return Object.values(record).flatMap((nested) => collectPrimitiveTerms(nested, depth + 1));
}

export function detectUtmFields(terms: string[]) {
  const normalizedTerms = terms.map(normalizeTerm);

  return utmFieldOrder.filter((field) => {
    const normalizedField = normalizeTerm(field);

    return normalizedTerms.some((term) => term.includes(normalizedField));
  });
}

function detectAttributionFields(terms: string[]) {
  const attributionTerms = [
    "source",
    "leadsource",
    "attribution",
    "referrer",
    "referer",
    "campaign",
    "medium",
    "fbclid",
    "gclid",
  ];
  const normalizedTerms = terms.map(normalizeTerm);

  return attributionTerms.filter((field) =>
    normalizedTerms.some((term) => term.includes(field)),
  );
}

function redactEmail(value: string) {
  const [local, domain] = value.split("@");

  if (!local || !domain) {
    return "redacted";
  }

  return `${local.charAt(0)}***@${domain}`;
}

function redactPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return `***${digits.slice(-4) || "0000"}`;
}

export function redactSensitiveRecord(record: GhlRecord): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeTerm(key);

    if (
      normalizedKey.includes("raw") ||
      normalizedKey.includes("payload") ||
      normalizedKey.includes("secret") ||
      normalizedKey.includes("token") ||
      normalizedKey.includes("apikey")
    ) {
      continue;
    }

    if (typeof value === "string") {
      if (normalizedKey.includes("email")) {
        safe[key] = redactEmail(value);
        continue;
      }

      if (normalizedKey.includes("phone")) {
        safe[key] = redactPhone(value);
        continue;
      }

      if (normalizedKey.includes("name")) {
        safe[key] = value.trim().charAt(0) || "redacted";
        continue;
      }

      safe[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      safe[key] = value.slice(0, 3).map((item) =>
        asRecord(item) ? redactSensitiveRecord(item as GhlRecord) : item,
      );
      continue;
    }

    const nested = asRecord(value);

    if (nested) {
      safe[key] = redactSensitiveRecord(nested);
      continue;
    }

    safe[key] = value;
  }

  return safe;
}

function resultFromRows(
  endpoint: GhlAuditEndpointKey,
  rows: GhlRecord[],
  path: string,
): GhlEndpointAuditResult {
  const fieldTerms = uniqueSorted(rows.flatMap((row) => collectFieldNames(row)));
  const searchableTerms = uniqueSorted([
    ...fieldTerms,
    ...rows.flatMap((row) => collectPrimitiveTerms(row)),
  ]);

  return {
    ok: true,
    count: rows.length,
    fieldNames: fieldTerms,
    utmFieldsFound: detectUtmFields(searchableTerms),
    attributionFieldsFound: detectAttributionFields(searchableTerms),
    notes: rows.length
      ? [`Endpoint responded using ${path}.`]
      : [`Endpoint responded using ${path}, but returned no sample rows.`],
    sample: rows.slice(0, 3).map(redactSensitiveRecord),
  };
}

async function callProbe(client: GhlClient, probe: Probe) {
  if (probe.method === "POST") {
    return client.post<unknown>(probe.path, probe.body ?? {});
  }

  return client.get<unknown>(probe.path, probe.params ?? {});
}

async function auditEndpoint(
  client: GhlClient,
  endpoint: GhlAuditEndpointKey,
  probes: Probe[],
) {
  const attempted: string[] = [];
  let lastError = "Endpoint was not attempted.";

  for (const probe of probes) {
    attempted.push(`${probe.method} ${probe.path}`);

    try {
      const body = await callProbe(client, probe);
      const rows = extractRows(body, endpoint);
      return resultFromRows(endpoint, rows, `${probe.method} ${probe.path}`);
    } catch (error) {
      lastError = errorMessage(error);
    }
  }

  return {
    ...emptyEndpoint([`Attempted: ${attempted.join(", ")}.`]),
    error: lastError,
  };
}

function probesFor(locationId: string): Record<GhlAuditEndpointKey, Probe[]> {
  const pageLimit = 10;

  return {
    contacts: [
      {
        method: "POST",
        path: "/contacts/search",
        body: { locationId, page: 1, pageLimit },
      },
    ],
    opportunities: [
      {
        method: "GET",
        path: "/opportunities/search",
        params: { location_id: locationId, limit: pageLimit },
      },
    ],
    forms: [
      { method: "GET", path: "/forms/", params: { locationId, limit: pageLimit } },
      { method: "GET", path: "/forms", params: { locationId, limit: pageLimit } },
    ],
    formSubmissions: [
      {
        method: "GET",
        path: "/forms/submissions",
        params: { locationId, limit: pageLimit },
      },
    ],
    funnels: [
      {
        method: "GET",
        path: "/funnels/funnel/list",
        params: { locationId, limit: pageLimit },
      },
      { method: "GET", path: "/funnels", params: { locationId, limit: pageLimit } },
    ],
    funnelPages: [
      {
        method: "GET",
        path: "/funnels/page/list",
        params: { locationId, limit: pageLimit },
      },
      {
        method: "GET",
        path: "/funnels/pages",
        params: { locationId, limit: pageLimit },
      },
    ],
    orders: [
      {
        method: "GET",
        path: "/payments/orders",
        params: { locationId, limit: pageLimit },
      },
    ],
    transactions: [
      {
        method: "GET",
        path: "/payments/transactions",
        params: { locationId, limit: pageLimit },
      },
    ],
    customFields: [
      { method: "GET", path: `/locations/${locationId}/customFields` },
      {
        method: "GET",
        path: "/custom-fields",
        params: { locationId, limit: pageLimit },
      },
    ],
    location: [{ method: "GET", path: `/locations/${locationId}` }],
  };
}

function hasAnyField(endpoints: Record<GhlAuditEndpointKey, GhlEndpointAuditResult>, fields: string[]) {
  const wanted = fields.map(normalizeTerm);

  return Object.values(endpoints).some((endpoint) =>
    endpoint.fieldNames.some((field) => {
      const normalized = normalizeTerm(field);
      return wanted.some((term) => normalized.includes(term));
    }),
  );
}

export function buildGhlAuditSummary(
  endpoints: Record<GhlAuditEndpointKey, GhlEndpointAuditResult>,
): GhlCapabilitySummary {
  const hasPageAnalytics = hasAnyField(endpoints, [
    "pageViews",
    "page_views",
    "visits",
    "sessions",
    "uniqueViews",
    "analytics",
  ]);
  const hasCheckoutStarts = hasAnyField(endpoints, [
    "checkoutStart",
    "checkout_start",
    "checkoutStarted",
    "checkoutStatus",
  ]);
  const hasUtmFields = Object.values(endpoints).some(
    (endpoint) => endpoint.utmFieldsFound.length > 0,
  );
  const canUseGhlForForms = endpoints.forms.ok || endpoints.formSubmissions.ok;
  const canUseGhlForOrders = endpoints.orders.ok || endpoints.transactions.ok;
  const directGa4StillRecommended = !(hasPageAnalytics && hasCheckoutStarts);
  const recommendedNextStep = directGa4StillRecommended
    ? canUseGhlForForms || canUseGhlForOrders
      ? "Use GoHighLevel for verified leads, forms, or order records, but plan direct GA4 for landing page views, CTA clicks, and checkout behavior unless the audit exposes those fields."
      : "Proceed with direct GA4 tracking for landing page views, CTA clicks, and checkout behavior."
    : "Validate GoHighLevel page analytics and checkout fields against the GoHighLevel UI before using GHL as the funnel behavior source of truth.";

  return {
    canUseGhlForLeads: endpoints.contacts.ok,
    canUseGhlForForms,
    canUseGhlForOrders,
    canUseGhlForCheckoutStarts: hasCheckoutStarts,
    canUseGhlForLandingPageViews: hasPageAnalytics,
    canUseGhlForUtmAttribution: hasUtmFields || false,
    directGa4StillRecommended,
    recommendedNextStep,
  };
}

export async function runGhlCapabilityAudit({
  env = process.env,
  fetcher = fetch,
  timeoutMs = 10_000,
}: AuditOptions = {}): Promise<GhlCapabilityAuditResult> {
  const tokenPresent = Boolean(env.GHL_API_KEY);
  const locationIdPresent = Boolean(env.GHL_LOCATION_ID);
  const config = getGhlConfig(env);

  if (!config) {
    const endpoints = emptyEndpoints();

    return {
      ok: false,
      locationIdPresent,
      tokenPresent,
      endpoints,
      summary: buildGhlAuditSummary(endpoints),
      errors: {
        config: "Add the GoHighLevel API token and location ID to run the audit.",
      },
    };
  }

  const client = createGhlClient(config, withTimeout(fetcher, timeoutMs));
  const probes = probesFor(config.locationId);
  const endpointEntries = await Promise.all(
    endpointKeys.map(async (key) => [key, await auditEndpoint(client, key, probes[key])] as const),
  );
  const endpoints = Object.fromEntries(endpointEntries) as Record<
    GhlAuditEndpointKey,
    GhlEndpointAuditResult
  >;
  const errors = Object.fromEntries(
    endpointEntries
      .filter(([, result]) => !result.ok && result.error)
      .map(([key, result]) => [key, result.error]),
  ) as Partial<Record<GhlAuditEndpointKey, string>>;

  return {
    ok: true,
    locationIdPresent,
    tokenPresent,
    endpoints,
    summary: buildGhlAuditSummary(endpoints),
    errors,
  };
}
