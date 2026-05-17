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
          <CartesianGrid stroke="#27272a" vertical={false} />
          <XAxis dataKey={xKey} stroke="#71717a" tickLine={false} />
          <YAxis stroke="#71717a" tickLine={false} width={48} />
          <Tooltip
            contentStyle={{
              background: "#09090b",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 8,
              color: "#fafafa",
            }}
          />
          <Bar
            dataKey={yKey}
            name={label ?? yKey}
            fill="#e4e4e7"
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
          <CartesianGrid stroke="#27272a" vertical={false} />
          <XAxis dataKey={xKey} stroke="#71717a" tickLine={false} />
          <YAxis stroke="#71717a" tickLine={false} width={48} />
          <Tooltip
            contentStyle={{
              background: "#09090b",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 8,
              color: "#fafafa",
            }}
          />
          {lines.map((line) => (
            <Line
              key={line.label}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color ?? "#f4f4f5"}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      )}
    </MeasuredChart>
  );
}
