import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const ranges = ["Today", "7D", "30D", "90D", "Custom"];

export function DateRangeSelector() {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-950 p-1 text-sm text-zinc-300 shadow-sm">
      <CalendarDays className="size-4 text-zinc-500" aria-hidden="true" />
      <span className="sr-only">Date range</span>
      {ranges.map((range) => (
        <button
          key={range}
          type="button"
          className={cn(
            "h-8 rounded px-2.5 text-xs font-medium transition hover:bg-white/5 hover:text-zinc-50",
            range === "7D" && "bg-white text-black hover:bg-white hover:text-black",
          )}
          aria-pressed={range === "7D"}
        >
          {range}
        </button>
      ))}
    </div>
  );
}
