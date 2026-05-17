import {
  creativeIdeas as mockCreativeIdeas,
  notionCreatives as mockNotionCreatives,
} from "@/lib/mock-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CreativeIdea, NotionCreative } from "@/lib/types";
import { readRowsWithFallback } from "./fallback";

function dollars(cents: number) {
  return cents / 100;
}

function rate(value: number, denominator: number) {
  return denominator === 0 ? 0 : value / denominator;
}

export function normalizeCreatives(rows: NotionCreative[]): CreativeIdea[] {
  return rows.map((creative) => {
    const spend = dollars(creative.spend_cents);
    const revenue = dollars(creative.revenue_cents);

    return {
      ideaTitle: creative.idea_title,
      hook: creative.hook,
      angle: creative.angle,
      format: creative.format,
      status: creative.status,
      linkedCampaign:
        creative.linked_ad_name ?? creative.linked_campaign_name ?? "Unassigned",
      spend,
      purchases: creative.purchases,
      cpa: rate(spend, creative.purchases),
      roas: rate(revenue, spend),
      notes: creative.notes ?? "",
    };
  });
}

export async function getCreativeData() {
  const supabase = getSupabaseServerClient();
  const result = await readRowsWithFallback({
    source: "Notion creatives",
    mockRows: mockNotionCreatives,
    query: async () =>
      supabase
        ? await supabase.from("notion_creatives").select("*")
        : { data: null, error: new Error("Supabase client unavailable.") },
  });

  return {
    mode: result.mode,
    creativeIdeas: result.mode === "mock" ? mockCreativeIdeas : normalizeCreatives(result.rows),
  };
}
