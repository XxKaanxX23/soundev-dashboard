"use client";

import dynamic from "next/dynamic";
import type { ChartDatum } from "./chart-renderers";

const MultiBarChartRenderer = dynamic(
  () => import("./chart-renderers").then((mod) => mod.MultiBarChartRenderer),
  { ssr: false },
);

type MultiBarChartCardProps<T> = {
  title: string;
  description?: string;
  data: T[];
  xKey: keyof T & string;
  bars: {
    key: keyof T & string;
    label: string;
    color?: string;
  }[];
};

export function MultiBarChartCard<T>({
  title,
  description,
  data,
  xKey,
  bars,
}: MultiBarChartCardProps<T>) {
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
        <MultiBarChartRenderer
          data={data as ChartDatum[]}
          xKey={xKey}
          bars={bars}
        />
      </div>
    </section>
  );
}
