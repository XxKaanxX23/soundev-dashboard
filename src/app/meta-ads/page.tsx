import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table";
import { DataModeBadge } from "@/components/dashboard/data-mode-badge";
import { KPICard } from "@/components/dashboard/kpi-card";
import { PageSection } from "@/components/dashboard/page-section";
import { SourceFreshness } from "@/components/dashboard/source-freshness";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getAdsData } from "@/lib/data/ads";
import { getSourceFreshness } from "@/lib/data/freshness";
import type { MetaAd } from "@/lib/types";
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatNumber,
  formatPercent,
  formatRatio,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

const columns: DataTableColumn<MetaAd>[] = [
  { header: "Campaign", accessor: "campaign" },
  { header: "Ad set", accessor: "adSet" },
  { header: "Ad name", accessor: "adName" },
  { header: "Date", accessor: "dateStart" },
  { header: "Spend", accessor: (row) => formatCurrency(row.spend), align: "right" },
  { header: "Impressions", accessor: (row) => formatNumber(row.impressions), align: "right" },
  { header: "Clicks", accessor: (row) => formatNumber(row.clicks), align: "right" },
  { header: "CTR", accessor: (row) => formatPercent(row.ctr), align: "right" },
  { header: "CPC", accessor: (row) => formatCurrencyPrecise(row.cpc), align: "right" },
  { header: "CPM", accessor: (row) => formatCurrencyPrecise(row.cpm), align: "right" },
  { header: "Purchases", accessor: (row) => formatNumber(row.purchases), align: "right" },
  { header: "CPA", accessor: (row) => formatCurrencyPrecise(row.cpa), align: "right" },
  { header: "Revenue", accessor: (row) => formatCurrency(row.revenue), align: "right" },
  { header: "ROAS", accessor: (row) => formatRatio(row.roas), align: "right" },
  { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
  { header: "Signal", accessor: (row) => <StatusBadge status={row.signal ?? "No Signal Yet"} /> },
  { header: "Creative angle", accessor: "creativeAngle" },
];

function metaAdRowKey(row: MetaAd, index: number) {
  return row.id ?? `${row.adId}-${row.dateStart}-${index}`;
}

export default async function MetaAdsPage() {
  const [{ metaAds, mode, overviewMetrics }, freshness] = await Promise.all([
    getAdsData(),
    getSourceFreshness("Meta Ads"),
  ]);
  const totalImpressions = metaAds.reduce((sum, ad) => sum + ad.impressions, 0);
  const totalClicks = metaAds.reduce((sum, ad) => sum + ad.clicks, 0);
  const averageCtr = totalImpressions === 0 ? 0 : totalClicks / totalImpressions;
  const averageCpc =
    totalClicks === 0 ? 0 : overviewMetrics.adSpend / totalClicks;

  return (
    <div className="space-y-6">
      <SourceFreshness
        provider="Meta Ads"
        mode={mode}
        label={freshness.label}
        detail={freshness.detail}
        status={freshness.status}
      />
      <PageSection
        title="Meta Ads"
        description="Ad account performance by campaign, ad set, ad, and creative angle."
      >
        <div className="mb-4">
          <DataModeBadge mode={mode} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard label="Spend" value={formatCurrency(overviewMetrics.adSpend)} />
          <KPICard label="Purchases" value={formatNumber(overviewMetrics.purchases)} />
          <KPICard
            label="CTR"
            value={formatPercent(averageCtr)}
            helper="CTR is clicks divided by impressions. It shows whether the ad gets people to stop and click."
          />
          <KPICard
            label="CPC"
            value={formatCurrencyPrecise(averageCpc)}
            helper="CPC is ad spend divided by clicks. It shows how expensive each site visit is."
          />
          <KPICard
            label="CPA"
            value={formatCurrencyPrecise(overviewMetrics.cpa)}
            helper="CPA is ad spend divided by purchases. For a $67 product, rising CPA quickly reduces room for refunds and fees."
            tone="warning"
          />
          <KPICard
            label="ROAS"
            value={formatRatio(overviewMetrics.roas)}
            helper="ROAS is revenue divided by ad spend. Lower ROAS means the ads need creative, targeting, or offer improvements."
            tone="danger"
          />
        </div>
      </PageSection>

      <PageSection title="Campaign and ad performance">
        <DataTable
          columns={columns}
          data={metaAds}
          getRowId={metaAdRowKey}
          emptyMessage="No Meta ad rows found for this period."
        />
      </PageSection>
    </div>
  );
}
