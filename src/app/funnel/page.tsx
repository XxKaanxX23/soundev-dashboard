import { BarChartCard } from "@/components/dashboard/bar-chart-card";
import { DataModeBadge } from "@/components/dashboard/data-mode-badge";
import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table";
import { KPICard } from "@/components/dashboard/kpi-card";
import { PageSection } from "@/components/dashboard/page-section";
import {
  getFunnelData,
  type FunnelContactRow,
  type FunnelOpportunityRow,
  type FunnelSourceRow,
} from "@/lib/data/funnel";
import type { FunnelStage } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

const stageColumns: DataTableColumn<FunnelStage>[] = [
  { header: "Stage", accessor: "stage" },
  { header: "Count", accessor: (row) => formatNumber(row.count), align: "right" },
  {
    header: "Stage conversion",
    accessor: (row) => formatPercent(row.conversionRate),
    align: "right",
  },
  { header: "Drop-off", accessor: (row) => formatNumber(row.dropOff), align: "right" },
];

const sourceColumns: DataTableColumn<FunnelSourceRow>[] = [
  { header: "Source", accessor: "source" },
  { header: "Leads", accessor: (row) => formatNumber(row.leads), align: "right" },
];

const contactColumns: DataTableColumn<FunnelContactRow>[] = [
  { header: "Name", accessor: "name" },
  { header: "Email", accessor: "email" },
  { header: "Phone", accessor: "phone" },
  { header: "Source", accessor: "source" },
  { header: "Campaign", accessor: "campaign" },
  { header: "First seen", accessor: "firstSeenAt" },
];

const opportunityColumns: DataTableColumn<FunnelOpportunityRow>[] = [
  { header: "Stage", accessor: "stage" },
  { header: "Pipeline", accessor: "pipelineName" },
  { header: "Status", accessor: "status" },
  { header: "Value", accessor: (row) => formatCurrency(row.value), align: "right" },
  { header: "Source", accessor: "source" },
  { header: "Opened", accessor: "openedAt" },
];

export default async function FunnelPage() {
  const {
    contacts,
    dashboardSnapshot,
    funnelStages,
    mode,
    opportunities,
    opportunitiesNote,
    overviewMetrics,
    topSources,
    utmCoverage,
  } = await getFunnelData();
  const isLive = mode !== "mock";

  return (
    <div className="space-y-6">
      <PageSection
        title="Funnel"
        description={
          isLive
            ? "GoHighLevel contacts and opportunities with Stripe purchase context."
            : "Mock GoHighLevel-style funnel data. Connect GoHighLevel to replace this fallback."
        }
      >
        <div className="mb-4">
          <DataModeBadge mode={mode} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            label="Leads"
            value={formatNumber(dashboardSnapshot.leads)}
            source={isLive ? "GoHighLevel" : "Mock fallback"}
          />
          <KPICard
            label="Opportunities"
            value={formatNumber(opportunities.length || dashboardSnapshot.appointments)}
            source={isLive ? "GoHighLevel" : "Mock fallback"}
          />
          <KPICard
            label="Purchases"
            value={formatNumber(dashboardSnapshot.successfulPurchases)}
            source={isLive ? "Stripe" : "Mock fallback"}
          />
          <KPICard
            label="Lead-to-purchase"
            value={formatPercent(overviewMetrics.leadToPurchaseRate)}
            source={isLive ? "GoHighLevel + Stripe" : "Mock fallback"}
            helper="Lead-to-purchase rate is Stripe purchases divided by GoHighLevel contacts."
          />
          <KPICard
            label="Failed payments"
            value={formatNumber(dashboardSnapshot.failedPayments)}
            source={isLive ? "Stripe" : "Mock fallback"}
            detail={formatPercent(overviewMetrics.failedPaymentRate)}
            helper="Failed payment rate is failed payments divided by checkout or opportunity volume."
            tone="danger"
          />
          <KPICard
            label="Refunds"
            value={formatNumber(dashboardSnapshot.refunds)}
            source={isLive ? "Stripe" : "Mock fallback"}
            detail={formatPercent(overviewMetrics.refundRate)}
            helper="Refund rate is refunds divided by purchases."
            tone="warning"
          />
          <KPICard
            label="UTM coverage"
            value={formatPercent(utmCoverage.coverageRate)}
            source={isLive ? "GoHighLevel contacts" : "Mock fallback"}
            detail={`${utmCoverage.trackedPurchases} of ${utmCoverage.totalPurchases} contacts fully tagged`}
          />
        </div>
      </PageSection>

      {/* Funnel stage charts */}
      <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <BarChartCard
          title="Funnel stage volume"
          data={funnelStages}
          xKey="stage"
          yKey="count"
          label="Count"
        />
        <PageSection title="Stage counts">
          <DataTable columns={stageColumns} data={funnelStages} />
        </PageSection>
      </div>

      {/* Lead source chart */}
      {topSources.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
          <BarChartCard
            title="Lead volume by source"
            data={topSources}
            xKey="source"
            yKey="leads"
            label="Leads"
          />
          <PageSection title="Top lead sources">
            <DataTable
              columns={sourceColumns}
              data={topSources}
              emptyMessage="No live GoHighLevel source data yet."
            />
          </PageSection>
        </div>
      )}

      {/* Contacts */}
      <PageSection title="Latest contacts">
        <DataTable
          columns={contactColumns}
          data={contacts}
          getRowId={(row) => row.id}
          emptyMessage="No live GoHighLevel contacts yet."
        />
      </PageSection>

      {/* Opportunities or empty state */}
      <PageSection title="Latest opportunities">
        {opportunitiesNote ? (
          <div className="rounded-md border border-dashed border-sd-border-strong bg-black/25 px-4 py-6 text-center">
            <p className="text-sm text-zinc-400">{opportunitiesNote}</p>
          </div>
        ) : (
          <DataTable
            columns={opportunityColumns}
            data={opportunities}
            getRowId={(row) => row.id}
            emptyMessage="No live GoHighLevel opportunities yet."
          />
        )}
      </PageSection>
    </div>
  );
}
