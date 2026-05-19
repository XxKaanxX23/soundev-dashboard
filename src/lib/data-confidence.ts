import type { SourceSystem } from "./source-of-truth";

export type MissingDataReason =
  | "not_connected"
  | "unavailable"
  | "waiting_for_first_sync"
  | "tracking_not_configured"
  | "source_stale"
  | "credential_issue";

export type MissingDataDisplayState = {
  status: MissingDataReason;
  label: string;
  detail: string;
};

export type DataConfidenceLevel = "high" | "medium" | "low" | "unavailable";

export type DataConfidenceResult = {
  level: DataConfidenceLevel;
  reasons: string[];
};

const SOURCE_LABELS: Record<SourceSystem, string> = {
  stripe: "Stripe",
  meta_ads: "Meta Ads",
  gohighlevel: "GoHighLevel",
  ga4: "GA4",
  manual_settings: "Manual settings",
};

const REASON_LABELS: Record<MissingDataReason, string> = {
  not_connected: "Not connected",
  unavailable: "Unavailable",
  waiting_for_first_sync: "Waiting for first sync",
  tracking_not_configured: "Tracking not configured",
  source_stale: "Source stale",
  credential_issue: "Credential issue",
};

export function sourceLabel(source: SourceSystem) {
  return SOURCE_LABELS[source];
}

export function getMissingDataDisplayState(
  status: MissingDataReason,
  {
    source,
    metricName,
  }: {
    source: SourceSystem | string;
    metricName?: string;
  },
): MissingDataDisplayState {
  const label = REASON_LABELS[status];
  const sourceName =
    typeof source === "string" && source in SOURCE_LABELS
      ? SOURCE_LABELS[source as SourceSystem]
      : source;
  const metric = metricName ?? "This metric";

  const detailByStatus: Record<MissingDataReason, string> = {
    not_connected: `${metric} is unavailable because ${sourceName} is not connected.`,
    unavailable: `${metric} is unavailable from the currently connected sources.`,
    waiting_for_first_sync: `${metric} is waiting for the first ${sourceName} sync.`,
    tracking_not_configured: `${metric} is unavailable until ${sourceName} tracking is configured.`,
    source_stale: `${metric} may be stale because ${sourceName} has not synced recently.`,
    credential_issue: `${metric} is unavailable because ${sourceName} credentials need attention.`,
  };

  return {
    status,
    label,
    detail: detailByStatus[status],
  };
}

function missingSourceReasons(
  requiredSources: SourceSystem[],
  connectedSources: SourceSystem[],
) {
  return requiredSources
    .filter((source) => !connectedSources.includes(source))
    .map((source) => `${sourceLabel(source)} source is not connected.`);
}

function staleSourceReasons(staleSources: SourceSystem[]) {
  return staleSources.map((source) => `${sourceLabel(source)} source is stale.`);
}

function missingFieldReasons(missingRequiredFields: string[]) {
  return missingRequiredFields.map((field) => `Missing required field: ${field}.`);
}

export function calculateDataConfidence({
  requiredSources,
  connectedSources,
  staleSources,
  missingRequiredFields,
}: {
  requiredSources: SourceSystem[];
  connectedSources: SourceSystem[];
  staleSources: SourceSystem[];
  missingRequiredFields: string[];
}): DataConfidenceResult {
  const reasons = [
    ...missingSourceReasons(requiredSources, connectedSources),
    ...staleSourceReasons(staleSources),
    ...missingFieldReasons(missingRequiredFields),
  ];

  if (reasons.length === 0) {
    return {
      level: "high",
      reasons: ["All required sources are connected and fresh."],
    };
  }

  if (requiredSources.some((source) => !connectedSources.includes(source))) {
    return {
      level: "unavailable",
      reasons,
    };
  }

  return {
    level: missingRequiredFields.length > 0 ? "medium" : "low",
    reasons,
  };
}

export function canUseMockBusinessData({
  hasLiveRows,
  isDemoMode,
}: {
  hasLiveRows: boolean;
  isDemoMode: boolean;
}) {
  return isDemoMode && !hasLiveRows;
}
