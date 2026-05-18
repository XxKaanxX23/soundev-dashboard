import Link from "next/link";
import { Activity } from "lucide-react";
import { ApiStateCard } from "@/components/dashboard/api-state-card";
import { DataModeBadge } from "@/components/dashboard/data-mode-badge";
import { PageSection } from "@/components/dashboard/page-section";
import { SourceConnectionCard } from "@/components/dashboard/source-connection-card";
import { getSettingsData } from "@/lib/data/settings";

export default async function SettingsPage() {
  const { mode, sourceConnections } = await getSettingsData();

  return (
    <div className="space-y-6">
      <PageSection
        title="Settings"
        description="Future source connections are represented with mock connection states only."
      >
        <div className="mb-4">
          <DataModeBadge mode={mode} />
        </div>
        <Link
          href="/settings/diagnostics"
          className="mb-6 flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-zinc-950 p-4 transition hover:border-white/20 hover:bg-zinc-900"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
              <Activity className="size-4 text-zinc-300" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-50">Diagnostics</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Verify Stripe webhook setup, Supabase writes, and latest stored
                payment events.
              </p>
            </div>
          </div>
          <span className="text-sm text-zinc-400">Open</span>
        </Link>
        <div className="mb-6 grid gap-3 lg:grid-cols-3">
          <ApiStateCard state="loading" />
          <ApiStateCard state="error" />
          <ApiStateCard state="empty" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {sourceConnections.map((connection) => (
            <SourceConnectionCard
              key={connection.provider}
              connection={connection}
            />
          ))}
        </div>
      </PageSection>
    </div>
  );
}
