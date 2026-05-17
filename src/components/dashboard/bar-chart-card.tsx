"use client";

import dynamic from "next/dynamic";
import type { ChartDatum } from "./chart-renderers";

const BarChartRenderer = dynamic(
  () => import("./chart-renderers").then((mod) => mod.BarChartRenderer),
  { ssr: false },
);

type BarChartCardProps<T> = {
  title: string;
  data: T[];
  xKey: keyof T & string;
  yKey: keyof T & string;
  label?: string;
};

export function BarChartCard<T>({
  title,
  data,
  xKey,
  yKey,
  label,
}: BarChartCardProps<T>) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-zinc-50">{title}</h2>
      <div className="mt-4 h-72">
        <BarChartRenderer
          data={data as ChartDatum[]}
          xKey={xKey}
          yKey={yKey}
          label={label}
        />
      </div>
    </section>
  );
}
