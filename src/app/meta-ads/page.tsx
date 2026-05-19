import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table";
import { DataModeBadge } from "@/components/dashboard/data-mode-badge";
import { KPICard } from "@/components/dashboard/kpi-card";
import { LineChartCard } from "@/components/dashboard/line-chart-card";
import { BarChartCard } from "@/components/dashboard/bar-chart-card";
import { ComposedChartCard } from "@/components/dashboard/composed-chart-card";
import { PageSection } from "@/components/dashboard/page-section";
import { SourceFreshness } from "@/components/dashboard/source-freshness";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getAdsData } from "@/lib/data/ads";
import { getSourceFreshness } from "@/lib/data/freshness";
import { chartPalette } from "@/components/dashboard/chart-renderers";
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

type DailyMetricPoint = {
  date: string;
  spend: number;
  purchases: number;
  cpa: number;
  ts: number;
};

function buildDailyMetrics(ads: MetaAd[]): DailyMetricPoint[] {
  const byDate = new Map<string, DailyMetricPoint>();
  ads.forEach((ad) => {
    const date = ad.dateStart ?? "";
    if (!date) return;
    const ts = new Date(date + "T00:00:00").getTime();
    const cur = byDate.get(date) ?? { date, spend: 0, purchases: 0, cpa: 0, ts };
    cur.spend += ad.spend;
    cur.purchases += ad.purchases;
    cur.ts = Math.min(cur.ts, ts);
    byDate.set(date, cur);
  });
  return [...byDate.values()]
    .sort((a, b) => a.ts - b.ts)
    .map((p) => ({
      ...p,
      cpa: p.purchases === 0 ? 0 : p.spend / p.purchases,
    }));
}

type CampaignSpendPoint = { campaign: string; spend: number; purchases: number };

function buildCampaignSpend(ads: MetaAd[]): CampaignSpendPoint[] {
  const byCampaign = new Map<string, CampaignSpendPoint>();
  ads.forEach((ad) => {
    const campaign = ad.campaign;
    const cur = byCampaign.get(campaign) ?? { campaign, spend: 0, purchases: 0 };
    cur.spend += ad.spend;
    cur.purchases += ad.purchases;
    byCampaign.set(campaign, cur);
  });
  return [...byCampaign.values()].sort((a, b) => b.spend - a.spend);
}

type SignalPoint = { signal: string; count: number };

function buildSignalDistribution(ads: MetaAd[]): SignalPoint[] {
  const counts = new Map<string, number>();
  ads.forEach((ad) => {
    const s = ad.signal ?? "No Signal Yet";
    counts.set(s, (counts.get(s) ?? 0) + 1);
  });
  const order = ["Winner", "Promising", "Watch", "Needs More Spend", "Losing", "Overspending", "No Signal Yet"];
  return order
    .filter((s) => counts.has(s))
    .map((signal) => ({ signal, count: counts.get(signal)! }));
}

export default async function MetaAdsPage() {
  const [{ metaAds, mode, overviewMetrics, metaRevenueWarning }, freshness] = await Promise.all([
    getAdsData(),
    getSourceFreshness("Meta Ads"),
  ]);
  const totalImpressions = metaAds.reduce((sum, ad) => sum + ad.impressions, 0);
  const totalClicks = metaAds.reduce((sum, ad) => sum + ad.clicks, 0);
  const averageCtr = totalImpressions === 0 ? 0 : totalClicks / totalImpressions;
  const averageCpc =
    totalClicks === 0 ? 0 : overviewMetrics.adSpend / totalClicks;

  const dailyMetrics = mode !== "mock" ? buildDailyMetrics(metaAds) : [];
  const campaignSpend = mode !== "mock" ? buildCampaignSpend(metaAds) : [];
  const signalDist = mode !== "mock" ? buildSignalDistribution(metaAds) : [];

  return (
    <div className="space-y-6">
      <SourceFreshness
        provider="Meta Ads"
        mode={mode}
        label={freshness.label}
        detail={freshness.detail}
        status={freshness.status}
      />

      {metaRevenueWarning && mode !== "mock" && (
        <div className="rounded-md border border-amber-400/20 bg-amber-400/10 px-4 py-3">
          <p className="text-sm text-amber-200">
            <strong>Meta revenue / action_values unavailable.</strong> Spend, impressions, clicks,
            and purchase counts are live. ROAS shows 0 because Meta is not reporting conversion
            values for this account. Check your Meta pixel events or conversion API setup.
          </p>
        </div>
      )}

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

      {/* Charts — only rendered with live data */}
      {dailyMetrics.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          <ComposedChartCard
            title="Daily spend vs. purchases"
            description="Bars = spend (left axis), line = purchases (right axis)"
            data={dailyMetrics}
            xKey="date"
            bars={[{ key: "spend", label: "Spend ($)", color: chartPalette.muted, yAxisId: "left" }]}
            lines={[{ key: "purchases", label: "Purchases", color: chartPalette.primary, yAxisId: "right" }]}
          />
          <LineChartCard
            title="Daily CPA trend"
            data={dailyMetrics}
            xKey="date"
            lines={[{ key: "cpa", label: "CPA ($)", color: chartPalette.indigo }]}
          />
        </div>
      )}

      {campaignSpend.length > 0 && (
        <BarChartCard
          title="Spend by campaign"
          data={campaignSpend}
          xKey="campaign"
          yKey="spend"
          label="Spend ($)"
        />
      )}

      {signalDist.length > 0 && (
        <BarChartCard
          title="Ad signal distribution"
          data={signalDist}
          xKey="signal"
          yKey="count"
          label="Ads"
        />
      )}

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
