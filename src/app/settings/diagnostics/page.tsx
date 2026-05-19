import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Database,
  Megaphone,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DataModeBadge } from "@/components/dashboard/data-mode-badge";
import { PageSection } from "@/components/dashboard/page-section";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getDiagnosticsData, type DiagnosticSummary } from "@/lib/diagnostics";
import type { DataMode } from "@/lib/data/fallback";

function YesNoBadge({ value }: { value: boolean }) {
  return <StatusBadge status={value ? "ready" : "disconnected"} />;
}

function EnvRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-sd-border py-3 last:border-b-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <YesNoBadge value={value} />
    </div>
  );
}

function DiagnosticCard({
  title,
  summary,
  empty,
}: {
  title: string;
  summary: DiagnosticSummary | null;
  empty: string;
}) {
  return (
    <section className="soundev-card rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
          <p className="mt-2 text-lg font-semibold text-zinc-50">
            {summary?.value ?? "No record"}
          </p>
        </div>
        <div className="soundev-icon flex size-9 items-center justify-center rounded-md">
          <ReceiptText className="size-4" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-sm text-zinc-400">{summary?.label ?? empty}</p>
      {summary?.detail ? (
        <p className="mt-2 text-xs leading-5 text-zinc-500">{summary.detail}</p>
      ) : null}
    </section>
  );
}

function diagnosticsMode({
  env,
  latestMetaMetricRow,
  latestGhlContact,
  latestGhlOpportunity,
  lastFailedPayment,
  lastRefund,
  lastStripeTransaction,
}: Awaited<ReturnType<typeof getDiagnosticsData>>): DataMode {
  if (
    latestMetaMetricRow ||
    latestGhlContact ||
    latestGhlOpportunity ||
    lastFailedPayment ||
    lastRefund ||
    lastStripeTransaction
  ) {
    return "live";
  }

  if (
    env.supabaseEnvDetected ||
    env.metaAdsEnvDetected ||
    env.ghlEnvDetected ||
    env.stripeSecretKeyDetected
  ) {
    return "partial";
  }

  return "mock";
}

export default async function DiagnosticsPage() {
  const diagnostics = await getDiagnosticsData();
  const mode = diagnosticsMode(diagnostics);

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-zinc-100"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Settings
      </Link>

      <PageSection
        title="Diagnostics"
        description="Internal setup checks for Stripe, Meta, and GoHighLevel testing. Secret values are never displayed."
      >
        <div className="mb-4">
          <DataModeBadge mode={mode} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="soundev-card rounded-lg p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="soundev-icon flex size-9 items-center justify-center rounded-md">
                <ShieldCheck className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-50">Setup Checks</h2>
                <p className="text-sm text-zinc-500">Presence only, no values.</p>
              </div>
            </div>
            <EnvRow
              label="Supabase env detected"
              value={diagnostics.env.supabaseEnvDetected}
            />
            <EnvRow
              label="Stripe secret key detected"
              value={diagnostics.env.stripeSecretKeyDetected}
            />
            <EnvRow
              label="Stripe webhook secret detected"
              value={diagnostics.env.stripeWebhookSecretDetected}
            />
            <EnvRow
              label="Supabase service role detected"
              value={diagnostics.env.supabaseServiceRoleDetected}
            />
            <EnvRow
              label="Meta Ads env detected"
              value={diagnostics.env.metaAdsEnvDetected}
            />
            <EnvRow
              label="GoHighLevel env detected"
              value={diagnostics.env.ghlEnvDetected}
            />
            <EnvRow
              label="Supabase admin client available"
              value={diagnostics.supabaseAdminClientAvailable}
            />
          </section>

          <section className="soundev-card rounded-lg p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="soundev-icon flex size-9 items-center justify-center rounded-md">
                <Activity className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-50">Last Stripe Sync Run</h2>
                <p className="text-sm text-zinc-500">
                  Latest row from the `sync_runs` table.
                </p>
              </div>
            </div>
            {diagnostics.lastSyncRun ? (
              <div>
                <StatusBadge status={diagnostics.lastSyncRun.value} />
                <p className="mt-3 text-lg font-semibold text-zinc-50">
                  {diagnostics.lastSyncRun.label}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {diagnostics.lastSyncRun.detail}
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-sd-border-strong bg-black/25 p-4">
                <p className="text-sm text-zinc-400">
                  No Stripe sync run found. Trigger a webhook after Supabase is
                  configured.
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="soundev-card rounded-lg p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="soundev-icon flex size-9 items-center justify-center rounded-md">
                <Megaphone className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-50">Last Meta Sync Run</h2>
                <p className="text-sm text-zinc-500">
                  Latest Meta Ads row from the `sync_runs` table.
                </p>
              </div>
            </div>
            {diagnostics.lastMetaSyncRun ? (
              <div>
                <StatusBadge status={diagnostics.lastMetaSyncRun.value} />
                <p className="mt-3 text-lg font-semibold text-zinc-50">
                  {diagnostics.lastMetaSyncRun.label}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {diagnostics.lastMetaSyncRun.detail}
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-sd-border-strong bg-black/25 p-4">
                <p className="text-sm text-zinc-400">
                  No Meta sync run found. Run the manual sync endpoint after
                  Supabase and Meta env vars are configured.
                </p>
              </div>
            )}
          </section>

          <section className="soundev-card rounded-lg p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="soundev-icon flex size-9 items-center justify-center rounded-md">
                <Database className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-50">
                  Latest Meta Metric Row
                </h2>
                <p className="text-sm text-zinc-500">
                  Latest row from `ad_daily_metrics`.
                </p>
              </div>
            </div>
            {diagnostics.latestMetaMetricRow ? (
              <div>
                <p className="text-lg font-semibold text-zinc-50">
                  {diagnostics.latestMetaMetricRow.value}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {diagnostics.latestMetaMetricRow.label}
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {diagnostics.latestMetaMetricRow.detail}
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-sd-border-strong bg-black/25 p-4">
                <p className="text-sm text-zinc-400">
                  No Meta daily metric rows found.
                </p>
              </div>
            )}
            {diagnostics.metaErrorState ? (
              <div className="mt-4 rounded-md border border-rose-300/20 bg-rose-300/10 p-3">
                <StatusBadge status={diagnostics.metaErrorState.value} />
                <p className="mt-2 text-sm text-rose-100">
                  {diagnostics.metaErrorState.detail}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="soundev-card rounded-lg p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="soundev-icon flex size-9 items-center justify-center rounded-md">
                <Users className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-50">
                  Last GoHighLevel Sync Run
                </h2>
                <p className="text-sm text-zinc-500">
                  Latest GoHighLevel row from the `sync_runs` table.
                </p>
              </div>
            </div>
            {diagnostics.lastGhlSyncRun ? (
              <div>
                <StatusBadge status={diagnostics.lastGhlSyncRun.value} />
                <p className="mt-3 text-lg font-semibold text-zinc-50">
                  {diagnostics.lastGhlSyncRun.label}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {diagnostics.lastGhlSyncRun.detail}
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-sd-border-strong bg-black/25 p-4">
                <p className="text-sm text-zinc-400">
                  No GoHighLevel sync run found. Run the manual sync endpoint
                  after Supabase and GoHighLevel env vars are configured.
                </p>
              </div>
            )}
            {diagnostics.ghlErrorState ? (
              <div className="mt-4 rounded-md border border-rose-300/20 bg-rose-300/10 p-3">
                <StatusBadge status={diagnostics.ghlErrorState.value} />
                <p className="mt-2 text-sm text-rose-100">
                  {diagnostics.ghlErrorState.detail}
                </p>
              </div>
            ) : null}
          </section>

          <section className="soundev-card rounded-lg p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="soundev-icon flex size-9 items-center justify-center rounded-md">
                <Database className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-50">
                  Latest GoHighLevel Records
                </h2>
                <p className="text-sm text-zinc-500">
                  Latest rows from `ghl_contacts` and `ghl_opportunities`.
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <DiagnosticCard
                title="Latest GHL Contact"
                summary={diagnostics.latestGhlContact}
                empty="No GoHighLevel contact stored yet."
              />
              <DiagnosticCard
                title="Latest GHL Opportunity"
                summary={diagnostics.latestGhlOpportunity}
                empty="No GoHighLevel opportunity stored yet."
              />
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <DiagnosticCard
            title="Last Stripe Transaction"
            summary={diagnostics.lastStripeTransaction}
            empty="No successful payment stored yet."
          />
          <DiagnosticCard
            title="Last Failed Payment"
            summary={diagnostics.lastFailedPayment}
            empty="No failed payment stored yet."
          />
          <DiagnosticCard
            title="Last Refund"
            summary={diagnostics.lastRefund}
            empty="No refund stored yet."
          />
        </div>

        <section className="mt-4 soundev-card rounded-lg p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="soundev-icon flex size-9 items-center justify-center rounded-md">
              <ReceiptText className="size-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-50">
                Last Stripe Backfill Sync
              </h2>
              <p className="text-sm text-zinc-500">
                Latest manual historical Stripe sync from `sync_runs`.
              </p>
            </div>
          </div>
          {diagnostics.lastStripeBackfillSync ? (
            <div>
              <StatusBadge status={diagnostics.lastStripeBackfillSync.value} />
              <p className="mt-3 text-lg font-semibold text-zinc-50">
                {diagnostics.lastStripeBackfillSync.label}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {diagnostics.lastStripeBackfillSync.detail}
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-sd-border-strong bg-black/25 p-4">
              <p className="text-sm text-zinc-400">
                No Stripe backfill sync found. Run the manual sync endpoint after
                Stripe and Supabase env vars are configured.
              </p>
            </div>
          )}
        </section>

        <section className="mt-4 soundev-card rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="soundev-icon flex size-9 items-center justify-center rounded-md">
              <Database className="size-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-50">Health Endpoint</h2>
              <p className="text-sm text-zinc-500">
                `GET /api/health/stripe` returns the same setup booleans as JSON.
              </p>
            </div>
          </div>
        </section>
      </PageSection>

      {/* Row counts section */}
      <PageSection title="Row Counts" description="Total rows in each synced table in Supabase.">
        <div className="overflow-hidden rounded-lg border border-sd-border-strong">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sd-border-strong">
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Table</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-400">Rows</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "transactions", count: diagnostics.rowCounts.transactions },
                { label: "failed_payments", count: diagnostics.rowCounts.failedPayments },
                { label: "refunds", count: diagnostics.rowCounts.refunds },
                { label: "ad_daily_metrics", count: diagnostics.rowCounts.adDailyMetrics },
                { label: "ads", count: diagnostics.rowCounts.ads },
                { label: "ad_sets", count: diagnostics.rowCounts.adSets },
                { label: "ad_campaigns", count: diagnostics.rowCounts.adCampaigns },
                { label: "ghl_contacts", count: diagnostics.rowCounts.ghlContacts },
                { label: "ghl_opportunities", count: diagnostics.rowCounts.ghlOpportunities },
              ].map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-sd-border-strong/50 last:border-b-0"
                >
                  <td className="px-4 py-3 font-mono text-zinc-300">{row.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-50">
                    {row.count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      {/* Field coverage section */}
      <PageSection
        title="Field Coverage"
        description="What percentage of records have key attribution fields populated."
      >
        <div className="overflow-hidden rounded-lg border border-sd-border-strong">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sd-border-strong">
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Field</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Description</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-400">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "Stripe UTM coverage",
                  description: "transactions with utm_source populated",
                  value: diagnostics.fieldCoverage.stripeUtmCoverage,
                },
                {
                  label: "Meta purchase value",
                  description: "ad_daily_metrics rows with revenue_cents > 0",
                  value: diagnostics.fieldCoverage.metaPurchaseValueCoverage,
                },
                {
                  label: "GHL UTM coverage",
                  description: "ghl_contacts with utm_source populated",
                  value: diagnostics.fieldCoverage.ghlUtmCoverage,
                },
              ].map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-sd-border-strong/50 last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium text-zinc-300">{row.label}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span
                      className={
                        row.value === 0
                          ? "text-red-400"
                          : row.value < 0.5
                            ? "text-amber-400"
                            : "text-emerald-400"
                      }
                    >
                      {Math.round(row.value * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="border-b border-sd-border-strong/50 last:border-b-0">
                <td className="px-4 py-3 font-medium text-zinc-300">GHL opportunities</td>
                <td className="px-4 py-3 text-zinc-500">total ghl_opportunities rows</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-50">
                  {diagnostics.fieldCoverage.opportunityCount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </PageSection>
    </div>
  );
}

