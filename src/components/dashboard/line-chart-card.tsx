"use client";

import dynamic from "next/dynamic";
import type { ChartDatum } from "./chart-renderers";

const LineChartRenderer = dynamic(
  () => import("./chart-renderers").then((mod) => mod.LineChartRenderer),
  { ssr: false },
);

type LineChartCardProps<T> = {
  title: string;
  data: T[];
  xKey: keyof T & string;
  lines: {
    key: keyof T & string;
    label: string;
    color?: string;
  }[];
};

export function LineChartCard<T>({
  title,
  data,
  xKey,
  lines,
}: LineChartCardProps<T>) {
  return (
    <section className="soundev-card soundev-card-hover rounded-lg p-4">
      <h2 className="text-sm font-semibold text-zinc-50">{title}</h2>
      <div className="mt-4 h-72">
        <LineChartRenderer
          data={data as ChartDatum[]}
          xKey={xKey}
          lines={lines}
        />
      </div>
    </section>
  );
}
