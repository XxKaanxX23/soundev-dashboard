import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const ranges = ["Today", "7D", "30D", "90D", "Custom"];

export function DateRangeSelector() {
  return (
    <div className="soundev-control inline-flex items-center gap-1 rounded-md p-1 text-sm">
      <CalendarDays className="size-4 text-sky-300/75" aria-hidden="true" />
      <span className="sr-only">Date range</span>
      {ranges.map((range) => (
        <button
          key={range}
          type="button"
          className={cn(
            "h-8 rounded px-2.5 text-xs font-medium transition hover:bg-sd-hover hover:text-zinc-50",
            range === "7D" &&
              "bg-sd-accent text-white shadow-[0_0_18px_rgba(47,140,255,0.32)] hover:bg-sd-accent-bright hover:text-white",
          )}
          aria-pressed={range === "7D"}
        >
          {range}
        </button>
      ))}
    </div>
  );
}
