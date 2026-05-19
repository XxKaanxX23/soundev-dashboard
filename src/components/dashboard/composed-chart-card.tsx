"use client";

import dynamic from "next/dynamic";
import type { ChartDatum } from "./chart-renderers";

const ComposedChartRenderer = dynamic(
  () => import("./chart-renderers").then((mod) => mod.ComposedChartRenderer),
  { ssr: false },
);

type Series = {
  key: string;
  label: string;
  color?: string;
  yAxisId?: string;
};

type ComposedChartCardProps<T> = {
  title: string;
  description?: string;
  data: T[];
  xKey: keyof T & string;
  lines?: Series[];
  bars?: Series[];
};

export function ComposedChartCard<T>({
  title,
  description,
  data,
  xKey,
  lines = [],
  bars = [],
}: ComposedChartCardProps<T>) {
  if (data.length === 0) {
    return (
      <section className="soundev-card rounded-lg p-4">
        <h2 className="text-sm font-semibold text-zinc-50">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        )}
        <div className="mt-4 flex h-48 items-center justify-center rounded border border-dashed border-sd-border-strong">
          <p className="text-sm text-zinc-500">No data available</p>
        </div>
      </section>
    );
  }

  return (
    <section className="soundev-card soundev-card-hover rounded-lg p-4">
      <h2 className="text-sm font-semibold text-zinc-50">{title}</h2>
      {description && (
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      )}
      <div className="mt-4 h-72">
        <ComposedChartRenderer
          data={data as ChartDatum[]}
          xKey={xKey}
          lines={lines}
          bars={bars}
        />
      </div>
    </section>
  );
}
