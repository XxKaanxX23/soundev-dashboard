import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table";
import { DataModeBadge } from "@/components/dashboard/data-mode-badge";
import { KPICard } from "@/components/dashboard/kpi-card";
import { PageSection } from "@/components/dashboard/page-section";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getRevenueData } from "@/lib/data/revenue";
import type { StripeTransaction } from "@/lib/types";
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatNumber,
  formatPercent,
} from "@/lib/utils";

const columns: DataTableColumn<StripeTransaction>[] = [
  { header: "Customer", accessor: "customerEmail" },
  { header: "Product", accessor: "productName" },
  { header: "Timestamp", accessor: "purchaseTimestamp" },
  { header: "Amount", accessor: (row) => formatCurrency(row.amount), align: "right" },
  { header: "Net", accessor: (row) => formatCurrencyPrecise(row.netAmount), align: "right" },
  { header: "Source", accessor: "utmSource" },
  { header: "Campaign", accessor: "utmCampaign" },
  { header: "Content", accessor: "utmContent" },
  { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
];

export default async function RevenuePage() {
  const { dashboardSnapshot, mode, overviewMetrics, stripeTransactions } =
    await getRevenueData();

  return (
    <div className="space-y-6">
      <PageSection
        title="Revenue"
        description="Stripe-style transaction view with purchase, refund, failed payment, and UTM context."
      >
        <div className="mb-4">
          <DataModeBadge mode={mode} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            label="Successful purchases"
            value={formatNumber(dashboardSnapshot.successfulPurchases)}
          />
          <KPICard
            label="Failed payments"
            value={formatNumber(dashboardSnapshot.failedPayments)}
            detail={`${formatPercent(overviewMetrics.failedPaymentRate)} of checkout starts`}
            helper="Failed payment rate shows how often checkout demand fails at the payment step."
            tone="danger"
          />
          <KPICard
            label="Refunds"
            value={formatNumber(dashboardSnapshot.refunds)}
            detail={`${formatPercent(overviewMetrics.refundRate)} of purchases`}
            helper="Refund rate shows the share of buyers who requested money back."
            tone="warning"
          />
          <KPICard label="Gross revenue" value={formatCurrency(overviewMetrics.grossRevenue)} />
          <KPICard label="Net revenue" value={formatCurrency(overviewMetrics.netRevenue)} />
          <KPICard
            label="Average order value"
            value={formatCurrency(dashboardSnapshot.averageOrderValue)}
          />
        </div>
      </PageSection>

      <PageSection title="Recent Stripe-style events">
        <DataTable
          columns={columns}
          data={stripeTransactions}
          getRowId={(row) => row.id}
        />
      </PageSection>
    </div>
  );
}
