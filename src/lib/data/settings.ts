import { sourceConnections as mockSourceConnections } from "@/lib/mock-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { readRowsWithFallback } from "./fallback";

export async function getSettingsData() {
  const supabase = getSupabaseServerClient();
  const result = await readRowsWithFallback({
    source: "Source connections",
    mockRows: mockSourceConnections,
    query: async () =>
      supabase
        ? await supabase.from("source_connections").select("*")
        : { data: null, error: new Error("Supabase client unavailable.") },
  });

  return {
    mode: result.mode,
    sourceConnections: result.rows,
  };
}
