import { PageSection } from "@/components/dashboard/page-section";
import { KPICard } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getMorningBriefData } from "@/lib/data/morning-brief";

function sourceLabel(source: string, classification: string) {
  return `${source} · ${classification}`;
}

function metricTone(label: string, value: string) {
  if (label === "Estimated Profit" && value.startsWith("-")) {
    return "danger" as const;
  }

  if (label === "Estimated Profit") {
    return "positive" as const;
  }

  return "neutral" as const;
}

export default async function MorningBriefPage() {
  const brief = await getMorningBriefData();

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-50">Morning Brief</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Last 24 hours · Chicago time · {brief.reportingWindowLabel}
            </p>
          </div>
          <div className="rounded-full border border-sd-border-strong bg-sd-surface-elevated px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-sky-200/80">
            Source-of-truth mode
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {brief.topSummary.map((metric) => (
            <KPICard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              source={sourceLabel(metric.source, metric.classification)}
              detail={metric.detail}
              tone={metricTone(metric.label, metric.value)}
            />
          ))}
        </div>
      </section>

      <section className="soundev-card rounded-lg p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-50">
              What happened
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Generated from verified sources only. Missing metrics stay marked.
            </p>
          </div>
          <StatusBadge status={brief.hasAnyLiveRows ? "live" : "no data"} />
        </div>
        <p className="max-w-5xl text-sm leading-6 text-zinc-300">
          {brief.summary}
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="soundev-card rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-zinc-50">
              Today&apos;s Action Plan
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Ordered by source health, missing measurement, profitability, pace, and tracking.
            </p>
          </div>
          <div className="space-y-3">
            {brief.actionItems.map((action, index) => (
              <div
                key={action.id}
                className="rounded-lg border border-sd-border bg-sd-surface-elevated/70 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-sd-border-strong bg-sd-accent/[0.12] text-xs font-semibold text-sky-100">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-100">
                      {action.title}
                    </h4>
                    <p className="mt-1 text-sm leading-5 text-zinc-500">
                      {action.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="soundev-card rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-zinc-50">Data Health</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Source status for this Morning Brief. Secrets are never shown.
            </p>
          </div>
          <div className="space-y-3">
            {brief.dataHealth.map((item) => (
              <div
                key={item.source}
                className="flex flex-col gap-2 rounded-lg border border-sd-border bg-sd-surface-elevated/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {item.source}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-zinc-500">
                    {item.detail}
                  </p>
                  {item.lastSyncedAt ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-sky-300/60">
                      Last sync: {new Date(item.lastSyncedAt).toLocaleString("en-US")}
                    </p>
                  ) : null}
                </div>
                <StatusBadge status={item.status.replace("_", "-")} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <PageSection
        title="Funnel Snapshot"
        description="GA4-dependent behavior metrics stay unavailable until GA4 and event tracking are configured."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Object.values(brief.funnelSnapshot).map((metric) => (
            <KPICard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              source={sourceLabel(metric.source, metric.classification)}
              detail={metric.detail}
            />
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Profit / Cashflow Estimate"
        description="This is operating guidance, not accounting-final profit."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {brief.profitCashflow.map((item) => (
            <section
              key={item.label}
              className="soundev-card soundev-card-hover rounded-lg p-4"
            >
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                {item.label}
              </p>
              <p className="mt-3 text-2xl font-semibold text-zinc-50">
                {item.value}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-sky-300/60">
                Source: {item.source} · {item.classification}
              </p>
              {item.detail ? (
                <p className="mt-2 text-sm leading-5 text-zinc-500">
                  {item.detail}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Unavailable Metrics"
        description="These are intentionally not estimated or mocked."
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {brief.unavailableMetrics.map((metric) => (
            <section key={metric.label} className="soundev-card rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-sm leading-5 text-zinc-500">
                    {metric.detail}
                  </p>
                </div>
                <StatusBadge status="not-connected" />
              </div>
            </section>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
