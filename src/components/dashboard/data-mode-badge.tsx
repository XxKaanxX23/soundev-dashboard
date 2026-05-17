import { cn } from "@/lib/utils";
import type { DataMode } from "@/lib/data/fallback";

const labelByMode: Record<DataMode, string> = {
  mock: "Mock Data",
  live: "Live Data",
  partial: "Partial Live Data",
};

const classByMode: Record<DataMode, string> = {
  mock: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  live: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  partial: "border-amber-300/25 bg-amber-300/10 text-amber-100",
};

export function DataModeBadge({ mode }: { mode: DataMode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        classByMode[mode],
      )}
    >
      {labelByMode[mode]}
    </span>
  );
}
