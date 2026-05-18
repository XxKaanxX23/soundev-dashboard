import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table";
import { DataModeBadge } from "@/components/dashboard/data-mode-badge";
import { KPICard } from "@/components/dashboard/kpi-card";
import { PageSection } from "@/components/dashboard/page-section";
import { SourceFreshness } from "@/components/dashboard/source-freshness";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getSourceFreshness } from "@/lib/data/freshness";
import { getRevenueData } from "@/lib/data/revenue";
import type { StripeTransaction } from "@/lib/types";
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatNumber,
  formatPercent,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

type RevenueFilter = "all" | "purchases" | "failed" | "refunded";

const filters: { label: string; value: RevenueFilter }[] = [
  { label: "All", value: "all" },
  { label: "Purchases", value: "purchases" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
];

function compactId(value?: string) {
  if (!value) {
    return "";
  }

  return value.length <= 14 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function applyRevenueFilters(
  rows: StripeTransaction[],
  filter: RevenueFilter,
  search: string,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return rows.filter((row) => {
    const statusMatch =
      filter === "all" ||
      (filter === "purchases" && row.status === "succeeded") ||
      (filter === "failed" && row.status === "failed") ||
      (filter === "refunded" && row.status === "refunded");

    if (!statusMatch) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [
      row.customerEmail,
      row.productName,
      row.paymentIntentId,
      row.chargeId,
      row.refundId,
      row.utmCampaign,
      row.utmContent,
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(normalizedSearch));
  });
}

const columns: DataTableColumn<StripeTransaction>[] = [
  { header: "Customer", accessor: "customerEmail" },
  { header: "Product", accessor: "productName" },
  { header: "Timestamp", accessor: "purchaseTimestamp" },
  { header: "Amount", accessor: (row) => formatCurrency(row.amount), align: "right" },
  { header: "Net", accessor: (row) => formatCurrencyPrecise(row.netAmount), align: "right" },
  { header: "Source", accessor: "utmSource" },
  { header: "Campaign", accessor: "utmCampaign" },
  { header: "Content", accessor: "utmContent" },
  { header: "Payment intent", accessor: (row) => compactId(row.paymentIntentId) },
  { header: "Charge", accessor: (row) => compactId(row.chargeId) },
  { header: "Refund", accessor: (row) => compactId(row.refundId) },
  { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
];

export default async function RevenuePage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string; q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const activeFilter = filters.some((filter) => filter.value === params.filter)
    ? (params.filter as RevenueFilter)
    : "all";
  const search = params.q ?? "";
  const [{ dashboardSnapshot, mode, overviewMetrics, stripeTransactions }, freshness] =
    await Promise.all([getRevenueData(), getSourceFreshness("Stripe")]);
  const filteredTransactions = applyRevenueFilters(
    stripeTransactions,
    activeFilter,
    search,
  );

  return (
    <div className="space-y-6">
      <SourceFreshness
        provider="Stripe"
        mode={mode}
        label={freshness.label}
        detail={freshness.detail}
        status={freshness.status}
      />
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
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Link
                key={filter.value}
                href={`/revenue?filter=${filter.value}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                className={
                  activeFilter === filter.value
                    ? "rounded-md border border-sky-300/35 bg-sd-accent/[0.16] px-3 py-2 text-sm text-sky-100 shadow-[0_0_18px_rgba(47,140,255,0.16)]"
                    : "soundev-control rounded-md px-3 py-2 text-sm"
                }
              >
                {filter.label}
              </Link>
            ))}
          </div>
          <form className="flex gap-2" action="/revenue">
            <input type="hidden" name="filter" value={activeFilter} />
            <input
              name="q"
              defaultValue={search}
              placeholder="Search customer or Stripe ID"
              className="soundev-control min-w-0 rounded-md px-3 py-2 text-sm outline-none placeholder:text-zinc-600"
            />
            <button className="soundev-control rounded-md px-3 py-2 text-sm">
              Search
            </button>
          </form>
        </div>
        <DataTable
          columns={columns}
          data={filteredTransactions}
          getRowId={(row) => row.id}
          emptyMessage="No Stripe events match this filter."
        />
      </PageSection>
    </div>
  );
}
