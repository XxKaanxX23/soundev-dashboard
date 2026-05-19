import { GA4_MEASUREMENT_ID } from "./client";

export const GA4_REQUIRED_EVENTS = [
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
] as const;

export type Ga4RequiredEventName = (typeof GA4_REQUIRED_EVENTS)[number];

export type Ga4EventCount = {
  eventName: string;
  eventCount: number;
};

export type Ga4RequiredEventStatus = Record<
  Ga4RequiredEventName,
  {
    found: boolean;
    count: number;
    note?: string;
  }
>;

export type Ga4EventAuditResult = {
  ok: boolean;
  propertyIdPresent: boolean;
  credentialsPresent: boolean;
  measurementIdKnown: typeof GA4_MEASUREMENT_ID;
  dateRange: "last 7 days";
  events: Ga4EventCount[];
  requiredEvents: Ga4RequiredEventStatus;
  summary: {
    canUseGa4ForLandingPageViews: boolean;
    canUseGa4ForCtaClicks: boolean;
    canUseGa4ForVideoEvents: boolean;
    canUseGa4ForCheckoutStarts: boolean;
    ga4InstrumentationNeeded: boolean;
    recommendedNextStep: string;
  };
  errors: Record<string, string>;
};

type DataApiRow = {
  dimensionValues?: { value?: string | null }[];
  metricValues?: { value?: string | null }[];
};

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeGa4EventRows(rows: DataApiRow[] = []): Ga4EventCount[] {
  return rows.map((row) => ({
    eventName: row.dimensionValues?.[0]?.value ?? "(not set)",
    eventCount: Math.round(asNumber(row.metricValues?.[0]?.value)),
  }));
}

export function buildRequiredEventStatus(
  events: Ga4EventCount[],
): Ga4RequiredEventStatus {
  const eventMap = new Map(events.map((event) => [event.eventName, event.eventCount]));

  return Object.fromEntries(
    GA4_REQUIRED_EVENTS.map((eventName) => [
      eventName,
      {
        found: (eventMap.get(eventName) ?? 0) > 0,
        count: eventMap.get(eventName) ?? 0,
        ...(eventName === "purchase"
          ? { note: "comparison only; Stripe remains purchase truth" }
          : {}),
      },
    ]),
  ) as Ga4RequiredEventStatus;
}

export function buildGa4EventAuditResult({
  propertyIdPresent,
  credentialsPresent,
  eventRows,
  landingPageViewCountFromPageView,
  errors,
}: {
  propertyIdPresent: boolean;
  credentialsPresent: boolean;
  eventRows: Ga4EventCount[];
  landingPageViewCountFromPageView: number;
  errors: Record<string, string>;
}): Ga4EventAuditResult {
  const requiredEvents = buildRequiredEventStatus(eventRows);
  const canUseGa4ForLandingPageViews =
    requiredEvents.landing_page_view.found ||
    (requiredEvents.page_view.found && landingPageViewCountFromPageView > 0);
  const canUseGa4ForCtaClicks = requiredEvents.primary_cta_click.found;
  const canUseGa4ForVideoEvents = [
    requiredEvents.video_play,
    requiredEvents.video_25_percent,
    requiredEvents.video_50_percent,
    requiredEvents.video_75_percent,
    requiredEvents.video_complete,
  ].some((event) => event.found);
  const canUseGa4ForCheckoutStarts = requiredEvents.checkout_start.found;
  const ga4InstrumentationNeeded =
    !canUseGa4ForLandingPageViews ||
    !canUseGa4ForCtaClicks ||
    !canUseGa4ForCheckoutStarts;
  const missing = [
    !canUseGa4ForLandingPageViews ? "landing page views" : null,
    !canUseGa4ForCtaClicks ? "primary_cta_click" : null,
    !canUseGa4ForCheckoutStarts ? "checkout_start" : null,
  ].filter(Boolean);

  return {
    ok: propertyIdPresent && credentialsPresent,
    propertyIdPresent,
    credentialsPresent,
    measurementIdKnown: GA4_MEASUREMENT_ID,
    dateRange: "last 7 days",
    events: eventRows,
    requiredEvents,
    summary: {
      canUseGa4ForLandingPageViews,
      canUseGa4ForCtaClicks,
      canUseGa4ForVideoEvents,
      canUseGa4ForCheckoutStarts,
      ga4InstrumentationNeeded,
      recommendedNextStep: ga4InstrumentationNeeded
        ? `Configure or verify GA4 tracking for ${missing.join(", ")}.`
        : "GA4 has the required landing page, CTA, and checkout events. Validate counts before using them for decisions.",
    },
    errors,
  };
}

export function missingGa4Metric(metricName: string, eventName: string) {
  return {
    status: "tracking_not_configured" as const,
    label: "Tracking not configured",
    detail: `${metricName} is unavailable because GA4 event ${eventName} is not configured or has no data.`,
  };
}
