import { Clock3 } from "lucide-react";
import { DataModeBadge } from "./data-mode-badge";
import { StatusBadge } from "./status-badge";
import type { DataMode } from "@/lib/data/fallback";

export function SourceFreshness({
  detail,
  label,
  mode,
  provider,
  status,
}: {
  provider: string;
  label: string;
  detail: string;
  status: string;
  mode: DataMode;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
            <Clock3 className="size-4 text-zinc-300" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-50">{provider} freshness</p>
            <p className="mt-1 text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <DataModeBadge mode={mode} />
          <StatusBadge status={status} />
        </div>
      </div>
    </section>
  );
}
