import { describe, expect, it, vi } from "vitest";
import {
  combineDataModes,
  hasSupabaseReadEnv,
  readRowsWithFallback,
} from "./fallback";

describe("data fallback helpers", () => {
  it("detects missing Supabase read env vars", () => {
    expect(
      hasSupabaseReadEnv({
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      }),
    ).toBe(false);
  });

  it("does not call the live query when env vars are missing", async () => {
    const query = vi.fn();

    const result = await readRowsWithFallback({
      source: "Revenue",
      mockRows: [{ id: "mock" }],
      query,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      },
    });

    expect(query).not.toHaveBeenCalled();
    expect(result.mode).toBe("mock");
    expect(result.rows).toEqual([{ id: "mock" }]);
  });

  it("falls back when a live table is empty", async () => {
    const result = await readRowsWithFallback({
      source: "Revenue",
      mockRows: [{ id: "mock" }],
      query: async () => ({ data: [], error: null }),
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      },
    });

    expect(result.mode).toBe("mock");
    expect(result.reason).toBe("Revenue returned no rows.");
  });

  it("returns live rows when Supabase returns data", async () => {
    const result = await readRowsWithFallback({
      source: "Revenue",
      mockRows: [{ id: "mock" }],
      query: async () => ({ data: [{ id: "live" }], error: null }),
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      },
    });

    expect(result.mode).toBe("live");
    expect(result.rows).toEqual([{ id: "live" }]);
  });

  it("combines mixed source modes into partial live data", () => {
    expect(combineDataModes(["live", "mock"])).toBe("partial");
    expect(combineDataModes(["live", "live"])).toBe("live");
    expect(combineDataModes(["mock", "mock"])).toBe("mock");
  });
});
