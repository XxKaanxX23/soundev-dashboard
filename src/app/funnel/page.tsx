import { BarChartCard } from "@/components/dashboard/bar-chart-card";
import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table";
import { KPICard } from "@/components/dashboard/kpi-card";
import { PageSection } from "@/components/dashboard/page-section";
import { getFunnelData } from "@/lib/data/funnel";
import type { FunnelStage } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/utils";

const columns: DataTableColumn<FunnelStage>[] = [
  { header: "Stage", accessor: "stage" },
  { header: "Count", accessor: (row) => formatNumber(row.count), align: "right" },
  {
    header: "Stage conversion",
    accessor: (row) => formatPercent(row.conversionRate),
    align: "right",
  },
  { header: "Drop-off", accessor: (row) => formatNumber(row.dropOff), align: "right" },
];

export default async function FunnelPage() {
  const { dashboardSnapshot, funnelStages, overviewMetrics } =
    await getFunnelData();

  return (
    <div className="space-y-6">
      <PageSection
        title="Funnel"
        description="Mock GoHighLevel-style lead, checkout, purchase, failure, and refund stages."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard label="Leads" value={formatNumber(dashboardSnapshot.leads)} />
          <KPICard
            label="Appointments"
            value={formatNumber(dashboardSnapshot.appointments)}
            detail="Not used in this funnel yet"
          />
          <KPICard
            label="Checkout starts"
            value={formatNumber(dashboardSnapshot.checkoutStarts)}
          />
          <KPICard label="Purchases" value={formatNumber(dashboardSnapshot.successfulPurchases)} />
          <KPICard
            label="Failed payments"
            value={formatNumber(dashboardSnapshot.failedPayments)}
            detail={formatPercent(overviewMetrics.failedPaymentRate)}
            helper="Failed payment rate is failed payments divided by checkout starts. It tells you how much buyer intent is being lost at payment."
            tone="danger"
          />
          <KPICard
            label="Refunds"
            value={formatNumber(dashboardSnapshot.refunds)}
            detail={formatPercent(overviewMetrics.refundRate)}
            helper="Refund rate is refunds divided by purchases. It helps catch expectation, product fit, or onboarding issues."
            tone="warning"
          />
          <KPICard
            label="Lead-to-purchase"
            value={formatPercent(overviewMetrics.leadToPurchaseRate)}
            helper="Lead-to-purchase rate shows how many leads eventually become buyers across the funnel."
          />
        </div>
      </PageSection>

      <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <BarChartCard
          title="Funnel stage volume"
          data={funnelStages}
          xKey="stage"
          yKey="count"
          label="Count"
        />
        <PageSection
          title="Drop-off points"
          description="Largest current leak is lead-to-checkout start."
        >
          <DataTable
            columns={columns}
            data={funnelStages}
            getRowKey={(row) => row.stage}
          />
        </PageSection>
      </div>
    </div>
  );
}
