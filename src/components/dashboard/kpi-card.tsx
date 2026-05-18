import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type KPICardProps = {
  label: string;
  value: string;
  detail?: string;
  helper?: string;
  source?: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
};

const toneStyles = {
  neutral: "text-zinc-50",
  positive: "text-emerald-200",
  warning: "text-amber-100",
  danger: "text-rose-100",
};

export function KPICard({
  label,
  value,
  detail,
  helper,
  source,
  tone = "neutral",
}: KPICardProps) {
  return (
    <section className="soundev-card soundev-card-hover rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
          {label}
        </p>
        {helper ? (
          <span
            className="inline-flex size-5 items-center justify-center rounded-full border border-sd-border-strong text-sky-300/80"
            title={helper}
            aria-label={helper}
          >
            <Info className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className={cn("mt-3 text-2xl font-semibold", toneStyles[tone])}>
        {value}
      </p>
      {source ? (
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-sky-300/60">
          Source: {source}
        </p>
      ) : null}
      {detail ? <p className="mt-2 text-sm text-zinc-500">{detail}</p> : null}
      {helper ? <p className="mt-3 text-xs leading-5 text-zinc-500">{helper}</p> : null}
    </section>
  );
}
