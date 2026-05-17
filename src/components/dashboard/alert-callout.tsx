import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { MetricAlert } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const toneStyles = {
  positive: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  warning: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  danger: "border-rose-300/20 bg-rose-300/10 text-rose-100",
};

export function AlertCallout({ alert }: { alert: MetricAlert }) {
  const Icon = alert.tone === "positive" ? CheckCircle2 : TriangleAlert;

  return (
    <article
      className={cn(
        "rounded-lg border p-4 shadow-sm shadow-black/20",
        toneStyles[alert.tone],
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold">{alert.title}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{alert.message}</p>
        </div>
      </div>
    </article>
  );
}
