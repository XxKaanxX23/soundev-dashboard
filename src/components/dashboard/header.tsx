import { DateRangeSelector } from "./date-range-selector";
import { DataModeBadge } from "./data-mode-badge";
import { getDashboardDataMode } from "@/lib/data/fallback";

export async function Header() {
  const dataMode = await getDashboardDataMode();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Private analytics
            </p>
            <DataModeBadge mode={dataMode} />
          </div>
          <h1 className="text-lg font-semibold text-zinc-50 sm:text-xl">
            Soundev Drum Mastery Suite
          </h1>
        </div>
        <DateRangeSelector />
      </div>
    </header>
  );
}
