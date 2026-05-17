import { AlertCallout } from "@/components/dashboard/alert-callout";
import { BarChartCard } from "@/components/dashboard/bar-chart-card";
import { DataHealthPanel } from "@/components/dashboard/data-health-panel";
import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table";
import { KPICard } from "@/components/dashboard/kpi-card";
import { LineChartCard } from "@/components/dashboard/line-chart-card";
import { NextActionsPanel } from "@/components/dashboard/next-actions-panel";
import { PageSection } from "@/components/dashboard/page-section";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getOverviewData } from "@/lib/data/overview";
import type { MetaAd } from "@/lib/types";
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatNumber,
  formatPercent,
  formatRatio,
} from "@/lib/utils";

const topAdColumns: DataTableColumn<MetaAd>[] = [
  { header: "Campaign", accessor: "campaign" },
  { header: "Ad", accessor: "adName" },
  { header: "Spend", accessor: (row) => formatCurrency(row.spend), align: "right" },
  { header: "Purchases", accessor: (row) => formatNumber(row.purchases), align: "right" },
  { header: "CPA", accessor: (row) => formatCurrencyPrecise(row.cpa), align: "right" },
  { header: "ROAS", accessor: (row) => formatRatio(row.roas), align: "right" },
  { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
];

export default async function OverviewPage() {
  const {
    channelRevenue,
    dataHealthItems,
    dashboardSnapshot,
    metricAlerts,
    metaAds,
    nextActions,
    overviewMetrics,
    revenueTrend,
    utmCoverage,
  } = await getOverviewData();

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-zinc-50">
            Overview / Command Center
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Mock 7-day operating view for Drum Mastery Suite at a $67 price point.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard label="Gross revenue" value={formatCurrency(overviewMetrics.grossRevenue)} />
          <KPICard label="Net revenue" value={formatCurrency(overviewMetrics.netRevenue)} />
          <KPICard label="Ad spend" value={formatCurrency(overviewMetrics.adSpend)} />
          <KPICard
            label="Estimated profit"
            value={formatCurrency(overviewMetrics.estimatedProfit)}
            tone="positive"
          />
          <KPICard label="Purchases" value={formatNumber(overviewMetrics.purchases)} />
          <KPICard
            label="Refunds"
            value={formatNumber(overviewMetrics.refunds)}
            detail={`${formatPercent(overviewMetrics.refundRate)} refund rate`}
            helper="Refund rate shows what share of buyers requested money back. A high rate can point to expectation or onboarding issues."
            tone="warning"
          />
          <KPICard
            label="Failed payments"
            value={formatNumber(overviewMetrics.failedPayments)}
            detail={`${formatPercent(overviewMetrics.failedPaymentRate)} failed payment rate`}
            helper="Failed payment rate is failed payments divided by checkout starts. It shows how much demand is being lost at payment."
            tone="danger"
          />
          <KPICard label="Leads" value={formatNumber(overviewMetrics.leads)} />
          <KPICard
            label="Cost per purchase"
            value={formatCurrencyPrecise(overviewMetrics.cpa)}
            helper="CPA is ad spend divided by purchases. Lower is better because each sale costs less to acquire."
            tone="warning"
          />
          <KPICard
            label="ROAS"
            value={formatRatio(overviewMetrics.roas)}
            helper="ROAS is revenue divided by ad spend. 2.00x means every $1 in ads produced $2 in revenue."
            tone="danger"
          />
          <KPICard
            label="Lead-to-purchase"
            value={formatPercent(overviewMetrics.leadToPurchaseRate)}
            helper="Lead-to-purchase rate shows how many leads eventually bought. It helps separate traffic quality from checkout performance."
          />
          <KPICard
            label="Checkout starts"
            value={formatNumber(dashboardSnapshot.checkoutStarts)}
          />
          <KPICard
            label="UTM coverage"
            value={formatPercent(utmCoverage.coverageRate)}
            detail={`${utmCoverage.trackedPurchases} of ${utmCoverage.totalPurchases} recent purchases fully tagged`}
            helper="UTM coverage is the share of purchases with source, campaign, and content tracking. Higher coverage means cleaner attribution."
          />
        </div>
      </section>

      <PageSection
        title="Warnings and opportunities"
        description="These callouts are generated from mock thresholds for CPA, ROAS, failed payments, refunds, and creative winners."
      >
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {metricAlerts.map((alert) => (
            <AlertCallout key={alert.id} alert={alert} />
          ))}
        </div>
      </PageSection>

      <div className="grid gap-4 xl:grid-cols-[.95fr_1.05fr]">
        <NextActionsPanel actions={nextActions} />
        <DataHealthPanel items={dataHealthItems} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
        <LineChartCard
          title="Revenue trend"
          data={revenueTrend}
          xKey="date"
          lines={[
            { key: "grossRevenue", label: "Gross revenue" },
            { key: "netRevenue", label: "Net revenue", color: "#a1a1aa" },
          ]}
        />
        <BarChartCard
          title="Revenue by source"
          data={channelRevenue}
          xKey="channel"
          yKey="revenue"
          label="Revenue"
        />
      </div>

      <PageSection title="Top paid acquisition signals">
        <DataTable
          columns={topAdColumns}
          data={metaAds}
          getRowKey={(row) => `${row.campaign}-${row.adName}`}
        />
      </PageSection>
    </div>
  );
}
