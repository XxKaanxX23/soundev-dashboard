import { Activity, AlertCircle, Database, Loader2 } from "lucide-react";
import type { DataHealthItem } from "@/lib/types";
import { StatusBadge } from "./status-badge";

const iconByStatus = {
  healthy: Activity,
  "setup-needed": Database,
  loading: Loader2,
  attention: AlertCircle,
  empty: Database,
};

export function DataHealthPanel({ items }: { items: DataHealthItem[] }) {
  return (
    <section className="soundev-card rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-50">Data Health</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Source connection status and sync freshness for the dashboard.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => {
          const Icon = iconByStatus[item.status];

          return (
            <article key={item.source} className="soundev-subcard rounded-md p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-sky-300/70" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{item.source}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">{item.detail}</p>
                    <p className="mt-2 text-xs text-zinc-600">{item.freshness}</p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
