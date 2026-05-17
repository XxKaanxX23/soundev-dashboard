import {
  instagramDailyMetrics as mockInstagramDailyMetrics,
  instagramPosts as mockInstagramPosts,
  instagramSummary as mockInstagramSummary,
} from "@/lib/mock-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { InstagramDailyMetric, InstagramPost } from "@/lib/types";
import { readRowsWithFallback } from "./fallback";

export function normalizeInstagramMetrics(rows: InstagramDailyMetric[]) {
  const summaryRow = rows.find((row) => !row.content_title) ?? rows[0];
  const posts: InstagramPost[] = rows
    .filter((row) => row.content_title && row.content_format && row.publish_date)
    .map((row) => ({
      title: row.content_title ?? "",
      format: row.content_format ?? "static",
      publishDate: row.publish_date ?? row.metric_date,
      reach: row.reach,
      engagementRate: row.engagement_rate ?? 0,
      linkClicks: row.link_clicks,
    }));

  return {
    instagramSummary: {
      followers: summaryRow?.followers ?? 0,
      reach: summaryRow?.reach ?? 0,
      profileVisits: summaryRow?.profile_visits ?? 0,
      linkClicks: summaryRow?.link_clicks ?? 0,
    },
    instagramPosts: posts,
  };
}

export async function getInstagramData() {
  const supabase = getSupabaseServerClient();
  const result = await readRowsWithFallback({
    source: "Instagram daily metrics",
    mockRows: mockInstagramDailyMetrics,
    query: async () =>
      supabase
        ? await supabase
            .from("instagram_daily_metrics")
            .select("*")
            .order("metric_date", { ascending: false })
        : { data: null, error: new Error("Supabase client unavailable.") },
  });
  const normalized =
    result.mode === "mock"
      ? {
          instagramSummary: mockInstagramSummary,
          instagramPosts: mockInstagramPosts,
        }
      : normalizeInstagramMetrics(result.rows);

  return {
    mode: result.mode,
    ...normalized,
  };
}
