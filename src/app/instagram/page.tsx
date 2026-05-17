import { DataTable, type DataTableColumn } from "@/components/dashboard/data-table";
import { KPICard } from "@/components/dashboard/kpi-card";
import { PageSection } from "@/components/dashboard/page-section";
import { getInstagramData } from "@/lib/data/instagram";
import type { InstagramPost } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/utils";

const columns: DataTableColumn<InstagramPost>[] = [
  { header: "Top post/reel", accessor: "title" },
  { header: "Content format", accessor: "format" },
  { header: "Publish date", accessor: "publishDate" },
  { header: "Reach", accessor: (row) => formatNumber(row.reach), align: "right" },
  {
    header: "Engagement rate",
    accessor: (row) => formatPercent(row.engagementRate),
    align: "right",
  },
  { header: "Link clicks", accessor: (row) => formatNumber(row.linkClicks), align: "right" },
];

export default async function InstagramPage() {
  const { instagramPosts, instagramSummary } = await getInstagramData();

  return (
    <div className="space-y-6">
      <PageSection
        title="Instagram"
        description="Mock Instagram analytics for organic reach, profile intent, and top content."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard label="Followers" value={formatNumber(instagramSummary.followers)} />
          <KPICard label="Reach" value={formatNumber(instagramSummary.reach)} />
          <KPICard
            label="Profile visits"
            value={formatNumber(instagramSummary.profileVisits)}
          />
          <KPICard label="Link clicks" value={formatNumber(instagramSummary.linkClicks)} />
        </div>
      </PageSection>

      <PageSection title="Top posts and reels">
        <DataTable
          columns={columns}
          data={instagramPosts}
          getRowKey={(row) => row.title}
        />
      </PageSection>
    </div>
  );
}
