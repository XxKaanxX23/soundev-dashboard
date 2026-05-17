import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Database,
  Megaphone,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { PageSection } from "@/components/dashboard/page-section";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getDiagnosticsData, type DiagnosticSummary } from "@/lib/diagnostics";

function YesNoBadge({ value }: { value: boolean }) {
  return <StatusBadge status={value ? "ready" : "disconnected"} />;
}

function EnvRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-3 last:border-b-0">
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
    <section className="rounded-lg border border-white/10 bg-zinc-950 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
          <p className="mt-2 text-lg font-semibold text-zinc-50">
            {summary?.value ?? "No record"}
          </p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
          <ReceiptText className="size-4 text-zinc-300" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-sm text-zinc-400">{summary?.label ?? empty}</p>
      {summary?.detail ? (
        <p className="mt-2 text-xs leading-5 text-zinc-500">{summary.detail}</p>
      ) : null}
    </section>
  );
}

export default async function DiagnosticsPage() {
  const diagnostics = await getDiagnosticsData();

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
        description="Internal setup checks for Stripe and Meta testing. Secret values are never displayed."
      >
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-white/10 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
                <ShieldCheck className="size-4 text-zinc-300" aria-hidden="true" />
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
              label="Supabase admin client available"
              value={diagnostics.supabaseAdminClientAvailable}
            />
          </section>

          <section className="rounded-lg border border-white/10 bg-zinc-950 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
                <Activity className="size-4 text-zinc-300" aria-hidden="true" />
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
              <div className="rounded-md border border-dashed border-white/10 p-4">
                <p className="text-sm text-zinc-400">
                  No Stripe sync run found. Trigger a webhook after Supabase is
                  configured.
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-white/10 bg-zinc-950 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
                <Megaphone className="size-4 text-zinc-300" aria-hidden="true" />
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
              <div className="rounded-md border border-dashed border-white/10 p-4">
                <p className="text-sm text-zinc-400">
                  No Meta sync run found. Run the manual sync endpoint after
                  Supabase and Meta env vars are configured.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-white/10 bg-zinc-950 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
                <Database className="size-4 text-zinc-300" aria-hidden="true" />
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
              <div className="rounded-md border border-dashed border-white/10 p-4">
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

        <section className="mt-4 rounded-lg border border-white/10 bg-zinc-950 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
              <Database className="size-4 text-zinc-300" aria-hidden="true" />
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
    </div>
  );
}
