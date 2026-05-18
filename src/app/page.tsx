import { AlertCallout } from "@/components/dashboard/alert-callout";
import { BarChartCard } from "@/components/dashboard/bar-chart-card";
import { DataHealthPanel } from "@/components/dashboard/data-health-panel";
import { DataModeBadge } from "@/components/dashboard/data-mode-badge";
import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table";
import { DataTrustPanel } from "@/components/dashboard/data-trust-panel";
import { KPICard } from "@/components/dashboard/kpi-card";
import { LineChartCard } from "@/components/dashboard/line-chart-card";
import { NextActionsPanel } from "@/components/dashboard/next-actions-panel";
import { PageSection } from "@/components/dashboard/page-section";
import { SourceFreshness } from "@/components/dashboard/source-freshness";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getSourceFreshness } from "@/lib/data/freshness";
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
  const [overview, stripeFreshness, metaFreshness] = await Promise.all([
    getOverviewData(),
    getSourceFreshness("Stripe"),
    getSourceFreshness("Meta Ads"),
  ]);
  const {
    breakEvenCPA,
    channelRevenue,
    dataHealthItems,
    dataTrustItems,
    displayMetrics,
    metricAlerts,
    metaAds,
    mode,
    nextActions,
    overviewMetrics,
    revenueTrend,
    stripeFees,
    utmCoverage,
  } = overview;

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-zinc-50">
              Overview / Command Center
            </h2>
            <DataModeBadge mode={mode} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            7-day operating view for Drum Mastery Suite at a $67 price point.
          </p>
        </div>
        <div className="mb-6 grid gap-3 lg:grid-cols-2">
          <SourceFreshness
            provider="Stripe"
            mode={mode}
            label={stripeFreshness.label}
            detail={stripeFreshness.detail}
            status={stripeFreshness.status}
          />
          <SourceFreshness
            provider="Meta Ads"
            mode={mode}
            label={metaFreshness.label}
            detail={metaFreshness.detail}
            status={metaFreshness.status}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            label="Gross revenue"
            value={formatCurrency(overviewMetrics.grossRevenue)}
            source="Stripe"
          />
          <KPICard
            label="Net revenue"
            value={formatCurrency(overviewMetrics.netRevenue)}
            source="Stripe"
          />
          <KPICard
            label="Ad spend"
            value={formatCurrency(overviewMetrics.adSpend)}
            source="Meta Ads"
          />
          <KPICard
            label="Estimated profit"
            value={formatCurrency(overviewMetrics.estimatedProfit)}
            source="Stripe + Meta Ads"
            tone="positive"
          />
          <KPICard
            label="Est. Stripe fees"
            value={formatCurrencyPrecise(stripeFees)}
            source="Stripe estimate"
            helper="Estimated using 2.9% plus $0.30 per successful payment. This is a planning estimate, not an accounting ledger."
          />
          <KPICard
            label="Break-even CPA"
            value={formatCurrencyPrecise(breakEvenCPA)}
            source="$67 product model"
            helper="Break-even CPA is product price minus estimated Stripe fee per purchase."
          />
          <KPICard
            label="Purchases"
            value={formatNumber(overviewMetrics.purchases)}
            source="Stripe"
          />
          <KPICard
            label="Refunds"
            value={formatNumber(overviewMetrics.refunds)}
            source="Stripe"
            detail={`${formatPercent(overviewMetrics.refundRate)} refund rate`}
            helper="Refund rate shows what share of buyers requested money back. A high rate can point to expectation or onboarding issues."
            tone="warning"
          />
          <KPICard
            label="Failed payments"
            value={formatNumber(overviewMetrics.failedPayments)}
            source="Stripe"
            detail={`${formatPercent(overviewMetrics.failedPaymentRate)} failed payment rate`}
            helper="Failed payment rate is failed payments divided by checkout starts. It shows how much demand is being lost at payment."
            tone="danger"
          />
          <KPICard
            label="Leads"
            value={displayMetrics.leads.value}
            source={displayMetrics.leads.source}
            helper={displayMetrics.leads.helper}
          />
          <KPICard
            label="Cost per purchase"
            value={formatCurrencyPrecise(overviewMetrics.cpa)}
            source="Meta Ads + Stripe"
            helper="CPA is ad spend divided by purchases. Lower is better because each sale costs less to acquire."
            tone="warning"
          />
          <KPICard
            label="ROAS"
            value={formatRatio(overviewMetrics.roas)}
            source="Stripe revenue + Meta spend"
            helper="ROAS is revenue divided by ad spend. 2.00x means every $1 in ads produced $2 in revenue."
            tone="danger"
          />
          <KPICard
            label="Lead-to-purchase"
            value={displayMetrics.leadToPurchase.value}
            source={displayMetrics.leadToPurchase.source}
            helper={displayMetrics.leadToPurchase.helper}
          />
          <KPICard
            label="Checkout starts"
            value={displayMetrics.checkoutStarts.value}
            source={displayMetrics.checkoutStarts.source}
            helper={displayMetrics.checkoutStarts.helper}
          />
          <KPICard
            label="UTM coverage"
            value={formatPercent(utmCoverage.coverageRate)}
            source="Stripe metadata"
            detail={`${utmCoverage.trackedPurchases} of ${utmCoverage.totalPurchases} recent purchases fully tagged`}
            helper="UTM coverage is the share of purchases with source, campaign, and content tracking. Higher coverage means cleaner attribution."
          />
        </div>
      </section>

      <DataTrustPanel items={dataTrustItems} />

      <PageSection
        title="Warnings and opportunities"
        description="These callouts are generated from the current dashboard metrics and trust checks."
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
          getRowId={(row, index) => row.id ?? `${row.adId}-${row.dateStart}-${index}`}
        />
      </PageSection>
    </div>
  );
}
