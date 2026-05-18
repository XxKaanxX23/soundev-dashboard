"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartDatum = Record<string, string | number>;

const chartColors = {
  grid: "color-mix(in srgb, var(--sd-border-strong) 55%, transparent)",
  text: "var(--sd-text-muted)",
  tooltipBackground: "var(--sd-surface)",
  tooltipBorder: "var(--sd-border-strong)",
  tooltipText: "var(--sd-text)",
  primary: "var(--sd-accent)",
};

function MeasuredChart({
  children,
}: {
  children: (size: { width: number; height: number }) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const measure = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      });
    };

    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className="h-full w-full">
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
}

export function BarChartRenderer({
  data,
  xKey,
  yKey,
  label,
}: {
  data: ChartDatum[];
  xKey: string;
  yKey: string;
  label?: string;
}) {
  return (
    <MeasuredChart>
      {({ width, height }) => (
        <BarChart
          width={width}
          height={height}
          data={data}
          margin={{ left: 0, right: 8, top: 8 }}
        >
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey={xKey} stroke={chartColors.text} tickLine={false} />
          <YAxis stroke={chartColors.text} tickLine={false} width={48} />
          <Tooltip
            contentStyle={{
              background: chartColors.tooltipBackground,
              border: `1px solid ${chartColors.tooltipBorder}`,
              borderRadius: 8,
              color: chartColors.tooltipText,
            }}
          />
          <Bar
            dataKey={yKey}
            name={label ?? yKey}
            fill={chartColors.primary}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      )}
    </MeasuredChart>
  );
}

export function LineChartRenderer({
  data,
  xKey,
  lines,
}: {
  data: ChartDatum[];
  xKey: string;
  lines: {
    key: string;
    label: string;
    color?: string;
  }[];
}) {
  return (
    <MeasuredChart>
      {({ width, height }) => (
        <LineChart
          width={width}
          height={height}
          data={data}
          margin={{ left: 0, right: 8, top: 8 }}
        >
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey={xKey} stroke={chartColors.text} tickLine={false} />
          <YAxis stroke={chartColors.text} tickLine={false} width={48} />
          <Tooltip
            contentStyle={{
              background: chartColors.tooltipBackground,
              border: `1px solid ${chartColors.tooltipBorder}`,
              borderRadius: 8,
              color: chartColors.tooltipText,
            }}
          />
          {lines.map((line) => (
            <Line
              key={line.label}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color ?? chartColors.primary}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      )}
    </MeasuredChart>
  );
}
