import { AlertCircle, Database, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const stateConfig = {
  loading: {
    icon: Loader2,
    title: "Loading state",
    body: "Shown while a future connector is fetching fresh records.",
    className: "border-sky-300/25 bg-sky-300/10",
  },
  error: {
    icon: AlertCircle,
    title: "Error state",
    body: "Shown when a future connector fails because of permissions, rate limits, or API downtime.",
    className: "border-rose-300/20 bg-rose-300/10",
  },
  empty: {
    icon: Database,
    title: "Empty state",
    body: "Shown when a source is connected but no matching records exist for the selected date range.",
    className: "border-sd-border-strong bg-zinc-500/10",
  },
};

export function ApiStateCard({ state }: { state: keyof typeof stateConfig }) {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <article className={cn("rounded-lg border p-4", config.className)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-sky-300/80" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{config.title}</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{config.body}</p>
        </div>
      </div>
    </article>
  );
}
