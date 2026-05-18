import { ShieldCheck } from "lucide-react";
import { StatusBadge } from "./status-badge";

type DataTrustItem = {
  source: string;
  status: string;
  detail: string;
};

export function DataTrustPanel({ items }: { items: DataTrustItem[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950 p-4 shadow-sm shadow-black/20">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-50">Data Trust</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Source-level truth status for the command center.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <article
            key={item.source}
            className="rounded-md border border-white/10 bg-black/30 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-zinc-500" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-zinc-100">{item.source}</h3>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-500">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
