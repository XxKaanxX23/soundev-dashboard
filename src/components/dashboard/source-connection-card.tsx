import { PlugZap } from "lucide-react";
import type { SourceConnection } from "@/lib/types";
import { StatusBadge } from "./status-badge";

export function SourceConnectionCard({
  connection,
}: {
  connection: SourceConnection;
}) {
  return (
    <section className="soundev-card soundev-card-hover rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="soundev-icon flex size-9 items-center justify-center rounded-md">
            <PlugZap className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-50">{connection.provider}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {connection.description}
            </p>
          </div>
        </div>
        <StatusBadge status={connection.status} />
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        {connection.last_sync_at
          ? `Mock sync: ${new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date(connection.last_sync_at))}`
          : "No live connection configured"}
      </p>
      <p className="mt-2 text-sm text-zinc-400">{connection.detail}</p>
    </section>
  );
}
