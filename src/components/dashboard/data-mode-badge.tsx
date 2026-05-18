import { cn } from "@/lib/utils";
import type { DataMode } from "@/lib/data/fallback";

const labelByMode: Record<DataMode, string> = {
  mock: "Mock Data",
  live: "Live Data",
  partial: "Partial Live Data",
};

const classByMode: Record<DataMode, string> = {
  mock: "border-sd-border-strong bg-zinc-500/10 text-zinc-300",
  live: "border-sky-300/30 bg-sd-accent/[0.15] text-sky-100 shadow-[0_0_16px_rgba(47,140,255,0.16)]",
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
