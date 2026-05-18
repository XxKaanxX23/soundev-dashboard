import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table";
import { KPICard } from "@/components/dashboard/kpi-card";
import { PageSection } from "@/components/dashboard/page-section";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getCreativeData } from "@/lib/data/creative";
import type { CreativeIdea } from "@/lib/types";
import { formatCurrency, formatCurrencyPrecise, formatNumber, formatRatio } from "@/lib/utils";

const columns: DataTableColumn<CreativeIdea>[] = [
  { header: "Idea title", accessor: "ideaTitle" },
  { header: "Hook", accessor: "hook" },
  { header: "Angle", accessor: "angle" },
  { header: "Format", accessor: "format" },
  { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
  { header: "Linked campaign/ad", accessor: "linkedCampaign" },
  { header: "Spend", accessor: (row) => formatCurrency(row.spend), align: "right" },
  { header: "Purchases", accessor: (row) => formatNumber(row.purchases), align: "right" },
  { header: "CPA", accessor: (row) => formatCurrencyPrecise(row.cpa), align: "right" },
  { header: "ROAS", accessor: (row) => formatRatio(row.roas), align: "right" },
  { header: "Notes", accessor: "notes" },
];

export default async function CreativeTrackerPage() {
  const { creativeIdeas } = await getCreativeData();
  const launched = creativeIdeas.filter((idea) =>
    ["launched", "winner", "loser"].includes(idea.status),
  ).length;
  const winners = creativeIdeas.filter((idea) => idea.status === "winner").length;
  const totalSpend = creativeIdeas.reduce((sum, idea) => sum + idea.spend, 0);
  const totalPurchases = creativeIdeas.reduce(
    (sum, idea) => sum + idea.purchases,
    0,
  );

  return (
    <div className="space-y-6">
      <PageSection
        title="Creative Tracker"
        description="Mock Notion-style creative pipeline for hooks, formats, statuses, and linked ad performance."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard label="Ideas tracked" value={formatNumber(creativeIdeas.length)} />
          <KPICard label="Launched" value={formatNumber(launched)} />
          <KPICard label="Winners" value={formatNumber(winners)} tone="positive" />
          <KPICard label="Tracked spend" value={formatCurrency(totalSpend)} />
          <KPICard label="Tracked purchases" value={formatNumber(totalPurchases)} />
        </div>
      </PageSection>

      <PageSection title="Creative planning and results">
        <DataTable
          columns={columns}
          data={creativeIdeas}
        />
      </PageSection>
    </div>
  );
}
