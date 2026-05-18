import {
  dashboardSnapshot as mockDashboardSnapshot,
  funnelStages as mockFunnelStages,
  overviewMetrics as mockOverviewMetrics,
} from "@/lib/mock-data";
import {
  calculateBusinessMetrics,
  calculateUtmCoverage,
  type BusinessMetrics,
  type UtmCoverage,
} from "@/lib/metrics";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { FunnelEvent, FunnelStage, GhlContact, GhlOpportunity } from "@/lib/types";
import { type DataMode, warnFallback } from "./fallback";
import { getRevenueData } from "./revenue";

type SupabaseRowsResult<Row> = {
  data: Row[] | null;
  error: { message?: string } | null;
};

type FunnelReadClient = {
  from: <Row>(table: string) => {
    select: (columns?: string) => {
      order: (
        column: string,
        options?: { ascending?: boolean },
      ) => Promise<SupabaseRowsResult<Row>>;
    };
  };
};

export type FunnelContactRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  campaign: string;
  firstSeenAt: string;
};

export type FunnelOpportunityRow = {
  id: string;
  contactId: string;
  stage: string;
  status: string;
  value: number;
  source: string;
  openedAt: string;
};

export type FunnelSourceRow = {
  source: string;
  leads: number;
};

function dollars(cents: number) {
  return cents / 100;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getFunnelReadClient() {
  return (getSupabaseServiceRoleClient() ??
    getSupabaseServerClient()) as FunnelReadClient | null;
}

function metadataNumber(event: FunnelEvent, key: string) {
  return typeof event.metadata === "object" &&
    event.metadata !== null &&
    !Array.isArray(event.metadata) &&
    typeof event.metadata[key] === "number"
    ? event.metadata[key]
    : 0;
}

function displayName(contact: GhlContact) {
  return (
    contact.name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.email ||
    "Unknown contact"
  );
}

function contactSource(contact: GhlContact) {
  return contact.lead_source || contact.utm_source || "Untracked";
}

export function normalizeFunnelEvents(rows: FunnelEvent[]): FunnelStage[] {
  return rows.map((event, index) => {
    const count = metadataNumber(event, "count");
    const previous = index === 0 ? count : metadataNumber(rows[index - 1], "count");

    return {
      stage: event.event_stage,
      count,
      conversionRate: index === 0 || previous === 0 ? 1 : count / previous,
      dropOff: metadataNumber(event, "drop_off"),
    };
  });
}

export function normalizeGhlContacts(rows: GhlContact[]): FunnelContactRow[] {
  return rows.map((contact) => ({
    id: contact.external_id ?? contact.id,
    name: displayName(contact),
    email: contact.email,
    phone: contact.phone ?? "",
    source: contactSource(contact),
    campaign: contact.utm_campaign ?? "",
    firstSeenAt: formatTimestamp(contact.first_seen_at),
  }));
}

export function normalizeGhlOpportunities(
  rows: GhlOpportunity[],
): FunnelOpportunityRow[] {
  return rows.map((opportunity) => ({
    id: opportunity.external_id ?? opportunity.id,
    contactId: opportunity.contact_id ?? "",
    stage:
      opportunity.pipeline_stage_name ??
      opportunity.stage_name ??
      "Unknown stage",
    status: opportunity.status,
    value: dollars(opportunity.value_cents),
    source: opportunity.lead_source ?? opportunity.utm_source ?? "Untracked",
    openedAt: formatTimestamp(opportunity.opened_at),
  }));
}

function topSourcesFromContacts(rows: GhlContact[]): FunnelSourceRow[] {
  const counts = new Map<string, number>();

  rows.forEach((contact) => {
    const source = contactSource(contact);
    counts.set(source, (counts.get(source) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([source, leads]) => ({ source, leads }))
    .sort((left, right) => right.leads - left.leads || left.source.localeCompare(right.source));
}

function funnelStagesFromRows({
  contacts,
  opportunities,
  purchases,
}: {
  contacts: GhlContact[];
  opportunities: GhlOpportunity[];
  purchases: number;
}): FunnelStage[] {
  const opportunityStageCounts = new Map<string, number>();

  opportunities.forEach((opportunity) => {
    const stage =
      opportunity.pipeline_stage_name ??
      opportunity.stage_name ??
      "Unknown stage";
    opportunityStageCounts.set(stage, (opportunityStageCounts.get(stage) ?? 0) + 1);
  });

  const stages: FunnelStage[] = [
    {
      stage: "Leads",
      count: contacts.length,
      conversionRate: 1,
      dropOff: 0,
    },
    {
      stage: "Opportunities",
      count: opportunities.length,
      conversionRate: contacts.length === 0 ? 0 : opportunities.length / contacts.length,
      dropOff: Math.max(contacts.length - opportunities.length, 0),
    },
  ];

  opportunityStageCounts.forEach((count, stage) => {
    stages.push({
      stage,
      count,
      conversionRate: opportunities.length === 0 ? 0 : count / opportunities.length,
      dropOff: Math.max(opportunities.length - count, 0),
    });
  });

  stages.push({
    stage: "Purchases",
    count: purchases,
    conversionRate: contacts.length === 0 ? 0 : purchases / contacts.length,
    dropOff: Math.max(contacts.length - purchases, 0),
  });

  return stages;
}

export function buildFunnelDataFromRows({
  contacts,
  opportunities,
  purchases,
  failedPayments,
  refunds,
}: {
  contacts: GhlContact[];
  opportunities: GhlOpportunity[];
  purchases: number;
  failedPayments: number;
  refunds: number;
}) {
  const hasLiveRows = contacts.length > 0 || opportunities.length > 0;

  if (!hasLiveRows) {
    return {
      mode: "mock" as const,
      funnelStages: mockFunnelStages,
      dashboardSnapshot: mockDashboardSnapshot,
      overviewMetrics: mockOverviewMetrics,
      contacts: [] as FunnelContactRow[],
      opportunities: [] as FunnelOpportunityRow[],
      topSources: [] as FunnelSourceRow[],
      utmCoverage: calculateUtmCoverage([]),
    };
  }

  const mode: DataMode = contacts.length > 0 ? "live" : "partial";
  const checkoutStarts = opportunities.length;
  const overviewMetrics: BusinessMetrics = calculateBusinessMetrics({
    grossRevenue: purchases * 67,
    refunds,
    adSpend: 0,
    purchases,
    leads: contacts.length,
    failedPayments,
    checkoutStarts,
  });
  const utmCoverage: UtmCoverage = calculateUtmCoverage(
    contacts.map((contact) => ({
      status: "succeeded",
      utmSource: contact.utm_source ?? undefined,
      utmCampaign: contact.utm_campaign ?? undefined,
      utmContent: contact.utm_content ?? undefined,
    })),
  );

  return {
    mode,
    funnelStages: funnelStagesFromRows({ contacts, opportunities, purchases }),
    dashboardSnapshot: {
      successfulPurchases: purchases,
      failedPayments,
      refunds,
      checkoutStarts,
      leads: contacts.length,
      appointments: opportunities.length,
      averageOrderValue: purchases === 0 ? 0 : 67,
    },
    overviewMetrics,
    contacts: normalizeGhlContacts(contacts),
    opportunities: normalizeGhlOpportunities(opportunities),
    topSources: topSourcesFromContacts(contacts),
    utmCoverage,
  };
}

async function readLiveRows<Row>(
  source: string,
  query: () => Promise<SupabaseRowsResult<Row>>,
) {
  try {
    const { data, error } = await query();

    if (error) {
      warnFallback(source, error.message ?? "Query failed.");
      return { rows: [] as Row[], failed: true };
    }

    return { rows: data ?? [], failed: false };
  } catch (error) {
    warnFallback(
      source,
      error instanceof Error ? error.message : "Query threw an unknown error.",
    );
    return { rows: [] as Row[], failed: true };
  }
}

export async function getFunnelData() {
  const supabase = getFunnelReadClient();

  if (!supabase) {
    warnFallback("GoHighLevel", "Supabase client unavailable.");
    return buildFunnelDataFromRows({
      contacts: [],
      opportunities: [],
      purchases: 0,
      failedPayments: 0,
      refunds: 0,
    });
  }

  const [contacts, opportunities, revenue] = await Promise.all([
    readLiveRows("GoHighLevel contacts", async () =>
      supabase
        .from<GhlContact>("ghl_contacts")
        .select("*")
        .order("first_seen_at", { ascending: false }),
    ),
    readLiveRows("GoHighLevel opportunities", async () =>
      supabase
        .from<GhlOpportunity>("ghl_opportunities")
        .select("*")
        .order("opened_at", { ascending: false }),
    ),
    getRevenueData(),
  ]);

  if (contacts.failed && opportunities.failed) {
    return buildFunnelDataFromRows({
      contacts: [],
      opportunities: [],
      purchases: 0,
      failedPayments: 0,
      refunds: 0,
    });
  }

  return buildFunnelDataFromRows({
    contacts: contacts.rows,
    opportunities: opportunities.rows,
    purchases: revenue.dashboardSnapshot.successfulPurchases,
    failedPayments: revenue.dashboardSnapshot.failedPayments,
    refunds: revenue.dashboardSnapshot.refunds,
  });
}
